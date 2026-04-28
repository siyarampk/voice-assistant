export default function ChatStream({ text }) {
    return (
        <div className="chat">
            {text || "Listening... Keep speaking"}
        </div>
    );
}