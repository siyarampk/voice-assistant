import fetch from "node-fetch";

export const getTime = async () => {
    return new Date().toLocaleString();
};

export const getWeather = async () => {
    const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=28.6&longitude=77.2&current_weather=true"
    );
    const data = await res.json();
    return `Temperature: ${data.current_weather.temperature}°C`;
};

let devices = {
    light: false,
    tv: false,
    vacuum: false
};

export const controlDevice = async ({ device, action }) => {
    devices[device] = action === "on";
    return `${device} turned ${action}`;
};