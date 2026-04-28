import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    azure: {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
        version: process.env.AZURE_OPENAI_API_VERSION
    }
};