import { useState, useCallback, useRef } from "react";

export default function useRealtimeAudio(onTranscript, onError, onStateChange) {
  const [isListening, setIsListening] = useState(false);

  // All mutable state lives in refs so closures always see current values
  const socketRef        = useRef(null);
  const recognitionRef   = useRef(null);
  const responseBufferRef = useRef("");
  const isListeningRef   = useRef(false);      // mirror of state for closures
  const isSpeakingRef    = useRef(false);      // true while speechSynthesis is active
  const interruptEnabledRef = useRef(false);   // gate: true only after TTS grace period

  // ─── TTS ────────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!text || !text.trim()) {
      onStateChange?.("IDLE");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Pick a decent voice
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.name.includes("Google US English")) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.rate  = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      interruptEnabledRef.current = false; // disable interruption at start
      onStateChange?.("SPEAKING");

      // Enable interruption after 1.5s grace period — gives the browser
      // TTS time to fully start without STT falsely picking it up
      setTimeout(() => {
        if (isSpeakingRef.current) {
          interruptEnabledRef.current = true;
        }
      }, 1500);
    };
    
    utterance.onend = () => {
      isSpeakingRef.current = false;
      interruptEnabledRef.current = false;
      onStateChange?.("IDLE");
    };
    
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      interruptEnabledRef.current = false;
      onStateChange?.("IDLE");
    };

    window.speechSynthesis.speak(utterance);
  }, [onStateChange]);

  // ─── WebSocket ───────────────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket("ws://localhost:3001");
    socketRef.current = socket;

    socket.onopen  = () => console.log("📡 WebSocket connected");
    socket.onerror = () => onError("WebSocket connection error");
    socket.onclose = () => console.log("📡 WebSocket closed");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📥 Backend:", data.type, data.content?.substring?.(0, 40) || "");

      switch (data.type) {
        case "text_chunk":
          responseBufferRef.current += data.content;
          break;

        case "text_end":
          speak(responseBufferRef.current);
          responseBufferRef.current = "";
          break;

        case "text_full":
          speak(data.content);
          break;

        case "interrupted":
          // Backend confirmed abort — go back to listening
          responseBufferRef.current = "";
          onStateChange?.("LISTENING");
          break;

        case "error":
          onError(data.content);
          onStateChange?.("IDLE");
          break;
      }
    };
  }, [speak, onError, onStateChange]);

  // ─── STT (Includes Barge-in Detection) ───────────────────────────────────────
  const startSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError("Speech recognition not supported in this browser."); return; }

    recognitionRef.current?.abort();

    const recognition = new SR();
    recognition.continuous    = true;
    recognition.interimResults = true;
    recognition.lang          = "en-US";
    recognitionRef.current    = recognition;

    recognition.onresult = (event) => {
      let interim = "";
      let final   = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final   += event.results[i][0].transcript;
        else                          interim += event.results[i][0].transcript;
      }

      // -- BARGE-IN DETECTION --
      // If the assistant is speaking and STT picks up new speech (interim > 2 chars)
      // and the 1.5s grace period has passed, interrupt immediately.
      // This is much safer than the Web Audio API RMS detector, which conflicts with STT mics.
      if (interim.trim().length > 2 && isSpeakingRef.current && interruptEnabledRef.current) {
        console.log(`🛑 User barge-in detected via STT: "${interim}"`);
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
        interruptEnabledRef.current = false;
        
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "interrupt" }));
        }
        
        onStateChange?.("INTERRUPTED");
        setTimeout(() => {
          if (isListeningRef.current) onStateChange?.("LISTENING");
        }, 600);
      }

      if (interim) onTranscript(interim, false);

      if (final.trim()) {
        onTranscript(final, true);
        onStateChange?.("PROCESSING");

        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "user_text", content: final.trim() }));
        } else {
          console.warn("⚠️ WS not open, dropping message");
          onStateChange?.("IDLE");
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        onError(`STT error: ${e.error}`);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognition.start();
  }, [onTranscript, onError, onStateChange]);

  // ─── Public controls ─────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    isListeningRef.current = true;
    setIsListening(true);
    connectSocket();
    startSTT();
    onStateChange?.("LISTENING");
  }, [connectSocket, startSTT, onStateChange]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);

    recognitionRef.current?.abort();

    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    interruptEnabledRef.current = false;

    socketRef.current?.close();

    onStateChange?.("IDLE");
  }, [onStateChange]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) stopListening();
    else startListening();
  }, [startListening, stopListening]);

  return { toggleListening, isListening };
}
