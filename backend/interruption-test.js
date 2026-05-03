/**
 * interruption-test.js
 * ─────────────────────────────────────────────────────────────
 * Verifies TRUE (not simulated) interruption handling.
 * 
 * How it works:
 *  1. Connects via WebSocket and sends a long-answer question
 *  2. After N chunks arrive, sends an "interrupt" message
 *  3. Waits 2 seconds for any remaining chunks to drain
 *  4. Reports:
 *     - How many chunks came before the interrupt
 *     - How many chunks leaked after the interrupt
 *     - The final message type from the backend
 *
 * Criteria for TRUE interruption:
 *   ✅ Backend sends "interrupted" (not "text_end")
 *   ✅ Leaked chunks ≤ 5 (acceptable network/buffer latency)
 *   ❌ Leaked chunks > 5 = simulated (just stopped sending, not aborted)
 * ─────────────────────────────────────────────────────────────
 */

import { WebSocket } from "ws";

const WS_URL = "ws://localhost:3001";
const INTERRUPT_AFTER_CHUNKS = 3;
const DRAIN_WAIT_MS = 2000;   // wait for leaked chunks after interrupt
const TEST_TIMEOUT_MS = 20000;

function runTest() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    let chunksBeforeInterrupt = 0;
    let chunksAfterInterrupt  = 0;
    let interrupted           = false;
    let finalMessage          = null;
    let drainTimer            = null;
    const timer = setTimeout(() => reject(new Error("Test timed out")), TEST_TIMEOUT_MS);

    const finish = () => {
      clearTimeout(timer);
      if (drainTimer) clearTimeout(drainTimer);
      ws.close();
      resolve({ chunksBeforeInterrupt, chunksAfterInterrupt, finalMessage });
    };

    ws.on("open", () => {
      console.log("📡 Connected to backend WebSocket");
      console.log("📤 Sending long-answer question...\n");

      ws.send(JSON.stringify({
        type: "user_text",
        content: "Tell me a detailed story about how artificial intelligence was invented and developed over the decades. Include key people, years, and breakthroughs."
      }));
    });

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "text_chunk") {
        if (!interrupted) {
          chunksBeforeInterrupt++;
          process.stdout.write(msg.content);

          if (chunksBeforeInterrupt === INTERRUPT_AFTER_CHUNKS) {
            console.log(`\n\n🛑 SENDING INTERRUPT after ${chunksBeforeInterrupt} chunks...\n`);
            interrupted = true;
            ws.send(JSON.stringify({ type: "interrupt" }));

            // Start drain timer — give backend time to process abort
            drainTimer = setTimeout(() => {
              if (!finalMessage) {
                finalMessage = "(timed out waiting for backend confirmation)";
                finish();
              }
            }, DRAIN_WAIT_MS);
          }
        } else {
          chunksAfterInterrupt++;
        }
      }

      if (msg.type === "text_end") {
        finalMessage = "text_end";
        finish();
      }

      if (msg.type === "interrupted") {
        finalMessage = "interrupted";
        console.log("✅ Backend confirmed: stream was aborted");
        // Wait a tiny bit more for any final leaked chunks
        setTimeout(finish, 200);
      }
    });

    ws.on("close", () => {
      if (!finalMessage) {
        clearTimeout(timer);
        resolve({ chunksBeforeInterrupt, chunksAfterInterrupt, finalMessage });
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ─── Run ──────────────────────────────────────────────────────
console.log("═══════════════════════════════════════════════════");
console.log("   TRUE INTERRUPTION VERIFICATION TEST");
console.log("═══════════════════════════════════════════════════\n");

runTest()
  .then(({ chunksBeforeInterrupt, chunksAfterInterrupt, finalMessage }) => {
    console.log("\n═══════════════════════════════════════════════════");
    console.log("   TEST RESULTS");
    console.log("═══════════════════════════════════════════════════");
    console.log(`Chunks before interrupt  : ${chunksBeforeInterrupt}`);
    console.log(`Chunks leaked after      : ${chunksAfterInterrupt}`);
    console.log(`Final backend message    : ${finalMessage}`);
    console.log("───────────────────────────────────────────────────");

    if (finalMessage === "interrupted" && chunksAfterInterrupt <= 5) {
      console.log("✅ VERDICT: INTERRUPTION IS REAL");
      console.log(`   Backend aborted the LLM stream.`);
      if (chunksAfterInterrupt > 0) {
        console.log(`   ${chunksAfterInterrupt} in-flight chunk(s) drained (acceptable network latency).`);
      } else {
        console.log("   Zero leaked chunks — instant abort.");
      }
    } else if (finalMessage === "interrupted" && chunksAfterInterrupt > 5) {
      console.log("⚠️  VERDICT: PARTIALLY REAL (LAGGY)");
      console.log(`   Backend eventually aborted, but ${chunksAfterInterrupt} chunks leaked.`);
      console.log("   The abort signal is working but the HTTP buffer is large.");
    } else if (finalMessage === "text_end") {
      console.log("❌ VERDICT: INTERRUPTION NOT HANDLED");
      console.log("   Backend completed the full stream ignoring the interrupt.");
    } else {
      console.log("⚠️  VERDICT: INCONCLUSIVE");
      console.log(`   Final message: ${finalMessage}`);
    }
    console.log("═══════════════════════════════════════════════════\n");

    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Test failed:", err.message);
    if (err.message.includes("ECONNREFUSED")) {
      console.error("   Is the backend running? Start it with: npm run dev");
    }
    process.exit(1);
  });
