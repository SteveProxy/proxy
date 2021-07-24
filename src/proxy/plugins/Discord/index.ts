import { Client, Presence } from 'discord-rpc';

import { Plugin } from '../Plugin';
import { Proxy } from '../../Proxy';

import { PluginConfigFactory } from '../../../interfaces';
import { version as packageVersion } from '../../../utils';

// todo Party support
export class Discord extends Plugin<PluginConfigFactory<'discord'>> {

    private client: Client = new Client({
        transport: 'ipc'
    });
    private activity: Presence;
    private reconnectAttempts = 3;

    constructor(proxy: Proxy) {
        super(proxy, {
            name: 'discord',
            description: 'Discord интеграция',
            prefix: '§9§lDiscord'
        }, {
            clientId: '818385655691214868'
        });

        const { proxy: { version } } = this.proxy.config;

        this.activity = {
            details: this.proxy.client.username,
            largeImageKey: 'steve',
            largeImageText: `SteveProxy | ${packageVersion}`,
            smallImageKey: 'minecraft',
            smallImageText: `Minecraft ${version}`,
            startTimestamp: Date.now(),
            buttons: [{
                label: 'Установить',
                url: 'https://github.com/SteveProxy/proxy'
            }]
        };
    }

    start(): void {
        const client = this.client;

        const events = <const>[
            'ready'
        ];

        events.forEach((event) => {
            client.on(event, this[event].bind(this));
        });

        /*client.subscribe('ACTIVITY_JOIN_REQUEST', (data) => console.log(data));*/

        this.login();
    }

    private ready() {
        this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${this.client.user.username}.`);

        const { isLobby } = this.proxy;

        const state = isLobby ?
            'В лобби'
            :
            `На сервере ${this.proxy.currentServer}`;

        this.setActivity({
            state,
            ...(
                !isLobby &&
                {
                    partyId: this.proxy.currentServer,
                    joinSecret: 'SteveProxy',
                    buttons: undefined
                }
            )
        });
    }

    private login(): void {
        const { plugins: { discord } } = this.proxy.config;

        const reconnectAttempts = this.reconnectAttempts;

        this.client.login(discord)
            .catch((error) => {
                console.error(error);

                if (this.reconnectAttempts) {
                    setTimeout(() => this.login(), (reconnectAttempts + 1 - this.reconnectAttempts) * 1000);

                    return this.reconnectAttempts--;
                }

                this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при авторизации!`);
            });
    }

    setActivity(activity: Presence): void {
        const updatedActivity = {
            ...this.activity,
            ...activity
        };

        if (JSON.stringify(this.activity) !== JSON.stringify(updatedActivity)) {
            this.activity = updatedActivity;

            this.client.setActivity(updatedActivity);
        }
    }

    stop(): void {
        this.client.destroy();
    }
}
