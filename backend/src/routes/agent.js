// ──────────────────────────────────────────────
// routes/agent.js
// Handles the /agent/run endpoint for processing voice input.
// ──────────────────────────────────────────────

import express from "express";
import { graph } from "../agent/graph.js";
import { model } from "../services/azureOpenAI.js";

const router = express.Router();

router.post("/run", async (req, res) => {
    const { input } = req.body;
    console.log(`\n🎤 Received input: "${input}"`);

    try {
        // Prepare headers for streaming text back to the frontend
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");

        // 1. Run the input through our LangGraph
        console.log("🧠 Processing intent through LangGraph...");
        const state = await graph.invoke({ input });

        // 2. If it's a specific tool (e.g. time, weather), the graph already computed the answer.
        if (state.output !== "LLM_RESPONSE") {
            res.write(state.output);
            return res.end();
        }

        // 3. Otherwise, it's a generic chat. We stream the response from Azure OpenAI.
        const stream = await model.stream([
            { role: "system", content: "You are a helpful, concise voice assistant." },
            { role: "user", content: input }
        ]);

        // Read chunks as they arrive and send them to the client
        for await (const chunk of stream) {
            if (chunk.content) {
                res.write(chunk.content);
                // process.stdout.write(chunk.content); // uncomment to see streaming in backend console
            }
        }
        
        console.log("\n  Stream complete.");
        res.end();

    } catch (error) {
        console.error("❌ Error in agent route:", error.message);
        if (!res.headersSent) {
            res.status(500).send("Assistant encountered an internal error.");
        } else {
            res.end("\n[Error processing request]");
        }
    }
});

export default router;