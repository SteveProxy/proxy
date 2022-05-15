import { Server } from 'minecraft-protocol';

import { config } from '../config';

import { Event } from './event';
import { Proxy, IClient } from '../proxy';

import { clearUUID, getVersion } from '../utils';

import { EventName } from './';

const { proxy: { protocolVersion: proxyProtocolVersion, version }, bridge: { whitelist } } = config.data!;

export type LoginEvent = EventName<'login'>;

export class Login extends Event<LoginEvent> {

    constructor() {
        super('login');
    }

    handler(client: IClient, server: Server): void {
        const { uuid, username, protocolVersion } = client;

        const proxy = new Proxy({
            server,
            client
        });

        if (protocolVersion !== proxyProtocolVersion) {
            return proxy.client.context.end(`Используйте версию ${version}`);
        }

        const isWhitelisted = whitelist.includes(uuid) ||
            whitelist.includes(clearUUID(uuid)) ||
            whitelist.includes(username);

        if (whitelist.length && !isWhitelisted) {
            return proxy.client.context.end('Вас нет в белом списке сервера!'); // kick_disconnect doesn't work on 1.16.5
        }

        this.registerCustomChannels(client);

        proxy.start();
    }

    registerCustomChannels(client: IClient): void {
        const customChannels: Map<string, any> = new Map([
            [client.protocolVersion >= getVersion('1.13-pre3') ? 'brand' : 'MC|Brand', ['string', []]]
        ]);

        customChannels.forEach((typeDefinition, channel) => (
            client.registerChannel(channel, typeDefinition)
        ));
    }
}
