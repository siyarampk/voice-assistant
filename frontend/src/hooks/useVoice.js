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

  const startListening = useCallback(() => {
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
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        onStateChange?.('LISTENING');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        onStateChange?.('IDLE');
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

  return { toggleListening, isListening, stopListening };
}