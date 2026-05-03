import { useState, useCallback, useRef } from "react";

export default function useVoice(onResult, onError, onStateChange) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      onStateChange?.('IDLE');
    }
  }, [onStateChange]);

  const startListening = useCallback((suppressStateChange = false) => {
    try {
      // Clean up previous instance if any
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        throw new Error("Speech recognition not supported in this browser.");
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        if (!suppressStateChange) onStateChange?.('LISTENING');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          onResult(finalTranscript, true);
        } else if (interimTranscript) {
          onResult(interimTranscript, false);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (!suppressStateChange) onStateChange?.('IDLE');
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          onError("Speech Error: " + event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      onError(err.message);
      onStateChange?.('IDLE');
    }
  }, [onResult, onError, onStateChange]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { toggleListening, startListening, isListening, stopListening };
}