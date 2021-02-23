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
