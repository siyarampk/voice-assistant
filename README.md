# voice-assistant

# 🎙️ Voice Assistant (Real-Time, Interruptible)

A real-time voice assistant that listens, understands, and responds with natural speech. It uses streaming Speech-to-Text (STT), an LLM-based agent layer, and Text-to-Speech (TTS), with built-in interruption handling for seamless conversations.

---

## 🚀 Features

- Real-time voice interaction (low latency)
- Streaming STT & TTS for faster responses  
- Interrupt support (barge-in): stops ongoing speech instantly  
- LLM-powered responses with context awareness  
- Tool integration support (APIs, workflows)  
- Clean UI with listening state indicator  

---

## 🧱 Architecture


User Speech
↓
Speech-to-Text (Streaming)
↓
LLM / Agent Layer (Intent + Tools + Memory)
↓
Text Stream
↓
Text-to-Speech (Streaming)
↓
Audio Playback



---

## 🛠️ Tech Stack

- Frontend: React (Vite)
- Backend: Node.js
- AI/Agent: LLM (OpenAI / Azure / LangChain)
- STT: Whisper / Azure Speech
- TTS: Azure TTS / Cartesia
- Communication: WebSockets / Streaming APIs

---

## 📦 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/voice-assistant.git
cd voice-assistant

Setup Backend

cd backend
npm install
cp .env.example .env
npm run dev

Setup Frontend

cd ../frontend
npm install
npm run dev



Project Structure

voice-assistant/
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   ├── stt/
│   │   ├── tts/
│   │   ├── interrupt/
│   │   └── server.js
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── index.html