import _minecraftData from "minecraft-data";

import { config } from "./config";

import { IParsedIP } from "./interfaces";

export function parseIP(ip: string): IParsedIP {
    const parsedIP = ip.match(/([^]+):([\d]+)/);

    if (parsedIP) {
        return {
            host: parsedIP[1],
            port: Number(parsedIP[2])
        };
    }

    return {
        host: ip,
        port: 25565
    };
}

export function generateID(length: number): string {
    const characters = "abcdefghijklmnopqrstuvwxyz1234567890";

    let id = "";

    for (let i = 0; i < length; i++) {
        id += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return id;
}

export function normalizeDuration(duration: number): string {
    duration /= 1000;
    
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.round(duration % 60);
    
    const pad = (number: number) => String(number > 9 ? number : `0${number}`);

    return `${pad(minutes)}:${pad(seconds)}`;
}

export const minecraftData = _minecraftData(config.proxy.version as string);