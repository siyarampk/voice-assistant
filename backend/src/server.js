// ──────────────────────────────────────────────
// server.js  – Express entry point
// ──────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config(); 
console.log("SERVER DEBUG: Loaded ENV keys:", Object.keys(process.env).filter(k => k.startsWith("AZURE_")));


import express from "express";
import cors from "cors";
import agentRoute from "./routes/agent.js";

const app = express();
 
app.use(cors());

 
app.use(express.json());

app.use("/agent", agentRoute);

// Health-check route – useful for debugging
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});