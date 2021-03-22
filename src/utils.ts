import _minecraftData from "minecraft-data";

import { config } from "./config";

import { IParsedIP } from "./interfaces";

export const TEXTURES_ENDPOINT = "http://textures.minecraft.net/texture/";
export const MINECRAFT_API_ENDPOINT = "https://api.minecraftservices.com/minecraft/profile/skins";
export const ASHCON_API_ENDPOINT = "https://api.ashcon.app/mojang/v2";

export const minecraftData = _minecraftData(config.proxy.version as string);

const pad = (number: number) => String(number > 9 ? number : `0${number}`);

export const nameRegExp = /^([a-z0-9_]{1,16}|[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{8}[0-9a-f]{4}[0-5][0-9a-f]{3}[089ab][0-9a-f]{3}[0-9a-f]{12})$/gi;

export function isValidNickname(nickname: string): boolean {
    return Boolean(
        nickname
            .match(nameRegExp)
    );
}

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
    const seconds = Math.floor(duration % 60);

    return `${pad(minutes)}:${pad(seconds)}`;
}

export function humanizeDate(timestamp: string | number): string {
    const currentDate = new Date(timestamp);

    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    return `${pad(day)}.${pad(month)}.${year}`;
}

export function randomInteger(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max + 1 - min));
}