// ──────────────────────────────────────────────
// server.js  – Express entry point
// ──────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config(); 


import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";
import agentRoute from "./routes/agent.js";
import { handleAudioSession } from "./services/audioService.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

app.use("/agent", agentRoute);

// Health-check route
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// WebSocket handling
wss.on("connection", (ws) => {
    console.log("🔌 New client connected via WebSocket");
    handleAudioSession(ws);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready`);
});