import moment from "moment";
import _minecraftData, { versions } from "minecraft-data";

import { config } from "./config";

import { IParsedIP } from "./interfaces";

import "moment/locale/ru";

moment.locale("ru");

export const TEXTURES_ENDPOINT = "http://textures.minecraft.net/texture/";
export const MINECRAFT_API_ENDPOINT = "https://api.minecraftservices.com/minecraft/profile/skins";
export const ASHCON_API_ENDPOINT = "https://api.ashcon.app/mojang/v2";

export const minecraftData = _minecraftData(config.proxy.version as string);

export const nameRegExp = /^([a-z0-9_]{1,16}|[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{8}[0-9a-f]{4}[0-5][0-9a-f]{3}[089ab][0-9a-f]{3}[0-9a-f]{12})$/gi;

const pad = (number: number) => String(number > 9 ? number : `0${number}`);

export function getVersion(version: string | number): number | string {
    const versionObject = versions.pc.filter((versionObject) => versionObject[
        typeof version === "string" ?
            "minecraftVersion"
            :
            "version"
    ] === version)[0];

    return versionObject[
        typeof version === "string" ?
            "version"
            :
            "minecraftVersion"
    ] as number | string;
}

export function isValidNickname(nickname: string): boolean {
    return Boolean(
        nickname
            .match(nameRegExp)
    );
}

export function parseIP(ip: string): IParsedIP {
    const LOCALHOST = "127.0.0.1";

    const parsedIP = ip.match(/([^]+):([\d]+)/);

    if (parsedIP) {
        return {
            host: parsedIP[1] !== "0.0.0.0" ?
                parsedIP[1]
                :
                LOCALHOST,
            port: Number(parsedIP[2])
        };
    }

    const isPort = ip.startsWith(":");

    return {
        host: ip && !isPort && ip !== "0.0.0.0" ?
            ip
            :
            LOCALHOST,
        port: isPort ?
            Number(ip.slice(1))
            :
            25565
    };
}

export function isValidIP(ip: string): boolean {
    return Boolean(
        ip.match(/^([a-zA-Z0-9][a-zA-Z0-9\-.]{1,61}(?:\.[a-zA-Z]{2,})+|\[(?:[a-fA-F0-9]{1,4}(?::[a-fA-F0-9]{1,4}){7}|::1|::)]|[0-9]{1,3}(?:\.[0-9]{1,3}){3})(?::([0-9]{1,5}))?$/)
    );
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

export function getCurrentTime(): string {
    const date = new Date();

    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function randomInteger(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max + 1 - min));
}

export function declOfNum(n: number, titles: string[]): string {
    return titles[(n % 10 === 1 && n % 100 !== 11) ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
}

moment.relativeTimeThreshold("s", 60);
moment.relativeTimeThreshold("ss", 0);
moment.relativeTimeThreshold("m", 60);
moment.relativeTimeThreshold("h", 24);
moment.relativeTimeThreshold("d", 31);
moment.relativeTimeThreshold("M", 12);
moment.relativeTimeThreshold("y", 365);
