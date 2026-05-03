import { model } from "./azureOpenAI.js";
import { graph } from "../agent/graph.js";

// Yield to event loop — lets pending WS messages (like "interrupt") be processed
const tick = () => new Promise(resolve => setImmediate(resolve));

export const handleAudioSession = (ws) => {

    let currentAbort = new AbortController();
    let generation = 0;

    const processInput = async (text, abortCtrl, myGen) => {
        console.log(`\n🧠 Processing [gen=${myGen}]: "${text}"`);
        const stale = () => myGen !== generation;

        try {
            const state = await graph.invoke({ input: text });
            if (stale()) { console.log(`⏹ [gen=${myGen}] stale after graph`); return; }

            const responseText = state.output;
            console.log(`🤖 Graph [gen=${myGen}]: "${responseText}"`);

            if (responseText === "LLM_RESPONSE") {
                console.log(`🌊 [gen=${myGen}] Streaming LLM...`);
                const stream = await model.stream(
                    [
                        {
                            role: "system",
                            content:
                                "You are a helpful, human-like voice assistant. " +
                                "Use short fillers like 'umm', 'well', or 'let me see' when gathering your thoughts. " +
                                "Keep responses concise and conversational."
                        },
                        { role: "user", content: text }
                    ],
                    { signal: abortCtrl.signal }
                );

                let chunksSent = 0;
                try {
                    for await (const chunk of stream) {
                        // ── YIELD TO EVENT LOOP ──────────────────────────
                        // This is the critical line: setImmediate() lets any
                        // pending WebSocket "interrupt" message be processed
                        // BEFORE we check stale() and send the chunk.
                        await tick();

                        if (stale()) {
                            console.log(`⏹ [gen=${myGen}] stale after ${chunksSent} chunks`);
                            break;
                        }
                        if (chunk.content) {
                            ws.send(JSON.stringify({ type: "text_chunk", content: chunk.content }));
                            process.stdout.write(chunk.content);
                            chunksSent++;
                        }
                    }
                } catch (err) {
                    if (err.name === "AbortError" || abortCtrl.signal.aborted) {
                        console.log(`⏹ [gen=${myGen}] HTTP aborted after ${chunksSent} chunks`);
                    } else {
                        throw err;
                    }
                }

                if (!stale() && !abortCtrl.signal.aborted) {
                    console.log(`\n✅ [gen=${myGen}] Complete (${chunksSent} chunks)`);
                    ws.send(JSON.stringify({ type: "text_end" }));
                }
                // Note: "interrupted" is sent by the interrupt handler itself

            } else {
                if (!stale()) {
                    ws.send(JSON.stringify({ type: "text_full", content: responseText }));
                }
            }

        } catch (error) {
            if (error.name === "AbortError" || abortCtrl.signal.aborted || stale()) {
                console.log(`⏹ [gen=${myGen}] aborted`);
            } else {
                console.error(`❌ [gen=${myGen}]:`, error.message);
                try { ws.send(JSON.stringify({ type: "error", content: "I encountered an error." })); } catch (_) {}
            }
        }
    };

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === "user_text") {
                currentAbort.abort();
                currentAbort = new AbortController();
                generation++;
                processInput(data.content, currentAbort, generation);

            } else if (data.type === "interrupt") {
                console.log(`🛑 Interrupt — gen ${generation} → ${generation + 1}`);
                currentAbort.abort();
                currentAbort = new AbortController();
                generation++;
                // Send "interrupted" immediately from HERE, not from processInput
                try { ws.send(JSON.stringify({ type: "interrupted" })); } catch (_) {}
            }

        } catch (err) {
            console.error("WS parse error:", err);
        }
    });

    ws.on("close", () => {
        currentAbort.abort();
        generation++;
        console.log("🔌 Session closed");
    });
};
