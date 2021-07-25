import { Server } from 'minecraft-protocol';

import { Event } from './Event';
import { Proxy } from '../proxy/Proxy';

import { IClient, IConfig } from '../interfaces';

import config from '../../config.json';

// @ts-ignore
const { bridge: { whitelist } }: IConfig = config;

export class Login extends Event<'login'> {

    constructor() {
        super('login');
    }

    handler(client: IClient, server: Server): void {
        const { uuid, username } = client;

        const proxy = new Proxy({ server, client });

        if (whitelist.length && !(
            whitelist.includes(uuid) ||
            whitelist.includes(uuid.replace('-', '')) ||
            whitelist.includes(username))
        ) {
            return proxy.client.context.end('Вас нет в белом списке сервера!'); // kick_disconnect doesnt work on 1.16.5
        }
        
        this.registerCustomChannels(client);

        proxy.start();
    }

    registerCustomChannels(client: IClient): void {
        const CUSTOM_CHANNELS: Map<string, any> = new Map([
            [client.protocolVersion >= 385 ? 'brand' : 'MC|Brand', ['string', []]] // 385 = 1.13-pre3
        ]);
        
        CUSTOM_CHANNELS.forEach((typeDefinition, channel) => client
            .registerChannel(channel, typeDefinition));
    }
}
