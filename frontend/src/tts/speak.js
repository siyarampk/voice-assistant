export function speak(text, onStart, onEnd) {
    try {
        if (!window.speechSynthesis) {
            console.error("Speech synthesis not supported");
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        if (!text) return;

        const utter = new SpeechSynthesisUtterance(text);
        
        // Find a high-quality voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = 
            voices.find(v => v.name.includes("Google US English") && v.name.includes("male")) ||
            voices.find(v => v.name.includes("Google")) ||
            voices.find(v => v.lang.startsWith("en")) ||
            voices[0];

        if (preferredVoice) {
            utter.voice = preferredVoice;
        }

        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.volume = 1.0;

        utter.onstart = () => {
            onStart?.();
        };

        utter.onend = () => {
            onEnd?.();
        };

        utter.onerror = (err) => {
            console.error("TTS error:", err);
            onEnd?.();
        };

        window.speechSynthesis.speak(utter);
    } catch (err) {
        console.error("TTS execution error:", err);
        onEnd?.();
    }
}

export function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}