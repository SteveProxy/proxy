import { IParsedIP } from '../interfaces';

export function parseIP(ip: string): IParsedIP {
    const LOCALHOST = '127.0.0.1';

    const parsedIP = ip.match(/([^]+):([\d]+)/);

    if (parsedIP) {
        return {
            host: parsedIP[1] !== '0.0.0.0' ?
                parsedIP[1]
                :
                LOCALHOST,
            port: Number(parsedIP[2])
        };
    }

    const isPort = ip.startsWith(':');

    return {
        host: ip && !isPort && ip !== '0.0.0.0' ?
            ip
            :
            LOCALHOST,
        port: isPort ?
            Number(ip.slice(1))
            :
            25565
    };
}
