// ──────────────────────────────────────────────
// agent/graph.js
// Defines the agent's logic flow: classify intent -> execute action.
// ──────────────────────────────────────────────

import { StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { getTime, getWeather, controlDevice } from "./tools.js";

// Define the shape of our state object
const StateSchema = z.object({
    input: z.string(),
    intent: z.string().optional(),
    device: z.string().optional(),
    output: z.string().optional()
});

// Step 1: Classify intent based on user input
const classifyIntent = async (state) => {
    const input = state.input.toLowerCase();

    if (input.includes("time")) return { ...state, intent: "time" };
    if (input.includes("weather")) return { ...state, intent: "weather" };
    if (input.includes("light")) return { ...state, intent: "device", device: "light" };
    if (input.includes("tv")) return { ...state, intent: "device", device: "tv" };
    if (input.includes("vacuum")) return { ...state, intent: "device", device: "vacuum" };

    // If no specific intent, default to generic chat (Azure OpenAI)
    return { ...state, intent: "chat" };
};

// Step 2: Execute based on classified intent
const execute = async (state) => {
    switch (state.intent) {
        case "time":
            return { ...state, output: await getTime() };

        case "weather":
            return { ...state, output: await getWeather() };

        case "device":
            const action = state.input.includes("on") ? "on" : "off";
            return {
                ...state,
                output: await controlDevice({ device: state.device, action })
            };

        default:
            // For general chat, we DO NOT call the LLM here.
            // We set output to a special flag. 
            // The route (agent.js) will catch this and stream the LLM response directly to the client.
            return {
                ...state,
                output: "LLM_RESPONSE"
            };
    }
};

// Build and compile the LangGraph
export const graph = new StateGraph(StateSchema)
    .addNode("intent_node", classifyIntent)
    .addNode("execute_node", execute)
    .addEdge("intent_node", "execute_node")
    .setEntryPoint("intent_node")
    .compile();