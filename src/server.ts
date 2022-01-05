import { createServer } from 'minecraft-protocol';

import { config } from './config';

import { escapeFormatting, formatBytes, version } from './utils';
import { Events, events } from './events';

import { IClient } from './proxy';

const { proxy } = config.data!;
const { description } = proxy;

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

            const maxRowLength = playerList.reduce((acc, row) => {
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

        // @ts-ignore Invalid lib types
        send!(null, response);
    }
});

events.forEach((Event) => {
    const event = new Event();

    server.on(event.name as Events, (client) => (
        event.handler(client as unknown as IClient, server)
    ));
});
