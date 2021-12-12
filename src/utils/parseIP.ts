export interface IParsedIP {
    host: string;
    port: number;
}

const LOCALHOST = '127.0.0.1';
const PLACEHOLDER = '0.0.0.0';

export function parseIP(ip: string): IParsedIP {
    const parsedIP = ip.match(/([^]+):([\d]+)/);

    if (parsedIP) {
        return {
            host: parsedIP[1] !== PLACEHOLDER ?
                parsedIP[1]
                :
                LOCALHOST,
            port: Number(parsedIP[2])
        };
    }

    const isPort = ip.startsWith(':');

    return {
        host: ip && !isPort && ip !== PLACEHOLDER ?
            ip
            :
            LOCALHOST,
        port: isPort ?
            Number(ip.slice(1))
            :
            25565
    };
}
