import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Try to load from the root of the backend folder
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { AzureChatOpenAI } from "@langchain/openai";

console.log("DEBUG: AZURE_OPENAI_API_KEY length:", process.env.AZURE_OPENAI_API_KEY?.length || 0);

if (!process.env.AZURE_OPENAI_API_KEY) {
    console.error("CRITICAL: AZURE_OPENAI_API_KEY is missing in process.env!");
}

export const model = new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_ENDPOINT
        ?.replace("https://", "")
        ?.replace(".openai.azure.com/", "")
        ?.replace(".openai.azure.com", ""),
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    temperature: 0.7,
    streaming: true,
});

console.log("🔧 Azure OpenAI service initialized successfully.");
