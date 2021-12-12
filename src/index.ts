import { createServer } from 'minecraft-protocol';

import { events } from './events';
import { config } from './config';
import { version, escapeFormatting, formatBytes } from './utils';

import { IClient } from './proxy';

import './lobby';

const { proxy } = config;
const { description } = proxy;

console.log('[Steve] Starting...');

const server = createServer({
    ...proxy,
    beforePing: (response, client, send) => {
        if (description.length) {
            const { heapUsed, heapTotal } = process.memoryUsage();

            const variables = new Map([
                ['version', version],
                ['heapUsed', formatBytes(heapUsed)],
                ['heapTotal', formatBytes(heapTotal)]
            ]);

            let playerList = description.map((row) => {
                variables.forEach((value, name) => (
                    row = row.replaceAll(`{${name}}`, value)
                ));

                return row;
            });

            const maxRowLength = playerList.reduce<number>((acc, row) => {
                const rowLength = escapeFormatting(row)
                    .length;

                return rowLength > acc ?
                    rowLength
                    :
                    acc;
            }, 0);

            playerList = playerList.map((row) => {
                const margin = maxRowLength - escapeFormatting(row).length;

                const spacing = (' ').repeat(margin);

                return row.replace('{spacing}', spacing);
            });

            response.players.sample = playerList
                .map((row) => ({
                    name: row,
                    id: '00000000-0000-0000-0000-000000000000'
                }));
        }

        // @ts-ignore
        send!(null, response);
    }
});

events.forEach((Event) => {
    const event = new Event();

    // @ts-ignore
    server.on(event.name, (client: IClient) => event.handler(client, server));
});
