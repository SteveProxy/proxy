import { Server } from 'minecraft-protocol';

import { Event } from './event';

import { IClient } from '../proxy';
import { EventName } from './';

export type ListeningEvent = EventName<'listening'>;

export class Listening extends Event<ListeningEvent> {

    constructor() {
        super('listening');
    }

    handler(client: IClient, server: Server): void {
        // @ts-ignore Invalid lib type
        const { address, port } = server.socketServer.address();

        console.log(`[Steve] Proxy started on ${address}:${port}`);
    }
}
