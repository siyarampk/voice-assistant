import React, { useState, useRef, useCallback } from "react";
import ParticleSphere from "./components/ParticleSphere";
import { askAssistant } from "./api/api";
import useVoice from "./hooks/useVoice";
import { speak, stopSpeaking } from "./tts/speak";
import "./styles.css";

export default function App() {
  const [appState, setAppState] = useState("IDLE"); // IDLE, LISTENING, PROCESSING, SPEAKING
  const controllerRef = useRef(null);

  const handleStateChange = (newState) => {
    setAppState(newState);
  };

  const handleSpeechResult = async (text) => {
    // 1. Update UI to processing
    setAppState("PROCESSING");

    // 2. Prepare API call
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();

    try {
      // 3. Call backend
      const response = await askAssistant(text, controllerRef.current.signal);

      // 4. Handle response and speak
      if (response) {
        speak(
          response,
          () => setAppState("SPEAKING"), // On start
          () => setAppState("IDLE")      // On end
        );
      } else {
        setAppState("IDLE");
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("AI Error:", err);
        setAppState("IDLE");
      }
    }
  };

  const handleError = (errorMsg) => {
    console.error(errorMsg);
    setAppState("IDLE");
  };

  const { toggleListening, isListening, stopListening } = useVoice(
    handleSpeechResult,
    handleError,
    handleStateChange
  );

  const handleSphereClick = () => {
    // Interrupt logic: If speaking or processing, stop everything and start listening again
    if (appState === "SPEAKING" || appState === "PROCESSING") {
      stopSpeaking();
      controllerRef.current?.abort();
      startNewSession();
    } else {
      toggleListening();
    }
  };

  const startNewSession = () => {
    setAppState("IDLE");
    setTimeout(() => {
      toggleListening();
    }, 100);
  };

  // Helper for status text
  const getStatusText = () => {
    switch (appState) {
      case "LISTENING": return "Listening... Keep speaking";
      case "PROCESSING": return "Thinking...";
      case "SPEAKING": return "Speaking...";
      default: return "Tap to start";
    }
  };

  const getSubText = () => {
    if (appState === "LISTENING") return "Tap again to finish";
    if (appState === "SPEAKING" || appState === "PROCESSING") return "Tap to interrupt";
    return "Your AI Assistant is ready";
  };

  return (
    <div className={`assistant-container state-${appState.toLowerCase()}`}>
      <div onClick={handleSphereClick} style={{ cursor: 'pointer', marginTop: '50px' }}>
        <ParticleSphere state={appState} />
      </div>


      <div className="status-text-container">
        <div className="status-main">{getStatusText()}</div>
        <div className="status-sub">{getSubText()}</div>
      </div>

      {/* Bottom accent or branding similar to the N in the screenshot */}
      {/* <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        fontWeight: 'bold'
      }}>
        N
      </div> */}
    </div>
  );
}