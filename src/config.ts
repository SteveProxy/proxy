import { JSONFile, Low } from 'lowdb';
import { ServerOptions } from 'minecraft-protocol';

import { getVersion, IParsedIP } from './utils';

export interface IConfig {
    proxy: ServerOptions & IParsedIP & {
        version: string;
        protocolVersion: number;
        favicon: string;
        description: string[];
    };
    lobby: IParsedIP;
    bridge: {
        whitelist: string[];
        prefix: string;
        title: string;
        ignoredPackets: string[];
    };
}

export const config = new Low(
    new JSONFile<IConfig>('./config.json')
);

await config.read();

config.data ||= {
    proxy: {
        'online-mode': true,
        host: '0.0.0.0',
        port: 25565,
        maxPlayers: 1,
        version: '1.18.2',
        protocolVersion: 0,
        motd: '                       §6§lSteveProxy',
        favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAA7EAAAOxAGVKw4bAAABlUlEQVRoge2awUoCQRiAd93R1cIsiPQg1Bv0AuExgo517yDUoUeIOkfRpUuXnqCIDnWoDh669QoFliWVBxFEk9XV7QW+OXj6Gfi/4zfrjJ8Dswuuv7qS94h4gtozfgp9NI55nniMPpXiedImQJ8k/H14FofQAGk0QBoNkMbYznsbccIfmM1m0BcyPvqxx+d9uxfx9YnlfoLWITRAGg2QRgOkMbaB0/0d9GGaz/tcdg79oN/lBQL+7Tq/3+iPbx/QO78DGiCNBkijAdL4V4e7ODAThuj/In5eDwK+vtPtoF8uLqFvfLyit+H8DmiANBogjQZIY2zn/ebBOfqtygn6aqWO3nbeX9wX0d88n6G/PtpD7/wOaIA0GiCNBkjjX1bXcaBYKqM34Tz6u1ptqoW3N9bQNz/f0NdbbfTO74AGSKMB0miANKY34v9fh01+vm989dHnU+mpFn58ekFfKufQ+x7P7/wOaIA0GiCNBkhj3n9aODCZ8HtBiwuFqRaIRkP0uTCLvjfg+5JtHud3QAOk0QBpNECaf0Y5Vy/cCoDAAAAAAElFTkSuQmCC',
        description: [
            '{spacing}§6§lSteveProxy§r',
            '{spacing}{version}',
            '',
            'Использовано памяти: {heapUsed}',
            'Выделено памяти: {heapTotal}'
        ]
    },
    lobby: {
        host: '0.0.0.0',
        port: 25566
    },
    bridge: {
        whitelist: [],
        prefix: '.',
        title: '§6§lSteveProxy§r',
        ignoredPackets: [
            'keep_alive'
        ]
    }
};

config.data.proxy.protocolVersion = getVersion(config.data.proxy.version);

await config.write();

