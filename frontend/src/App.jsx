import React, { useState, useRef } from "react";
import ParticleSphere from "./components/ParticleSphere";
import useRealtimeAudio from "./hooks/useRealtimeAudio";
import "./styles.css";

export default function App() {
  const [appState, setAppState] = useState("IDLE"); // IDLE, LISTENING, PROCESSING, SPEAKING, INTERRUPTED
  const [lastTranscript, setLastTranscript] = useState("");

  const handleStateChange = (newState) => {
    setAppState(newState);
  };

  const handleTranscript = (text, isFinal) => {
    setLastTranscript(text);
    if (isFinal) {
      setAppState("PROCESSING");
    }
  };

  const handleError = (errorMsg) => {
    console.error("Audio Error:", errorMsg);
    setAppState("IDLE");
  };

  const { toggleListening, isListening } = useRealtimeAudio(
    handleTranscript,
    handleError,
    handleStateChange
  );

  const handleSphereClick = () => {
    toggleListening();
  };

  // Helper for status text
  const getStatusText = () => {
    switch (appState) {
      case "LISTENING": return "I'm listening...";
      case "PROCESSING": return "Thinking...";
      case "SPEAKING": return "Speaking...";
      case "INTERRUPTED": return "I'm sorry, go ahead...";
      default: return isListening ? "Listening for 'Hey Assistant'..." : "Tap to start";
    }
  };

  const getSubText = () => {
    if (appState === "LISTENING") return lastTranscript || "Speak now";
    if (appState === "SPEAKING" || appState === "PROCESSING") return "Tap to stop";
    return "Your real-time AI assistant";
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
      
      {lastTranscript && appState === "LISTENING" && (
        <div className="transcript-overlay">
          &ldquo;{lastTranscript}&rdquo;
        </div>
      )}
    </div>
  );
}