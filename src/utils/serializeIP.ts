import { IParsedIP, parseIP } from './parseIP';

export function serializeIP(ip: string | IParsedIP): string {
    return Object.values(
        typeof ip === 'string' ?
            parseIP(ip)
            :
            ip
    )
        .join(':');
}
