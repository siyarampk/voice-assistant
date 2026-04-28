export async function askAssistant(text, signal) {
    try {
        const res = await fetch("http://localhost:3001/agent/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: text }),
            signal
        });

        if (!res.ok) throw new Error(`API failed with status: ${res.status}`);

        // Since the backend streams, this will await the whole stream to finish
        // and return the complete string to the App.
        return await res.text();
    } catch (err) {
        throw new Error("API Error: " + err.message);
    }
}