import { Client, Presence } from 'discord-rpc';

import { config } from '../../../config';

import { Plugin } from '../plugin';
import { Proxy } from '../../index';

import { version as packageVersion } from '../../../utils';

const { proxy: { version } } = config.data!;

// todo Party support
export class Discord extends Plugin {

    #client: Client = new Client({
        transport: 'ipc'
    });
    #activity: Presence;
    #reconnectAttempts = 3;

    constructor(proxy: Proxy) {
        super(proxy, {
            name: 'discord',
            description: 'Discord интеграция',
            prefix: '§9§lDiscord'
        });

        this.#activity = {
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
        const client = this.#client;

        const events = <const>[
            'ready'
        ];

        events.forEach((event) => {
            client.on(event, this[event].bind(this));
        });

        /*client.subscribe('ACTIVITY_JOIN_REQUEST', (data) => console.log(data));*/

        this.#login();
    }

    private ready(silent?: boolean) {
        if (!silent) {
            this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${this.#client.user.username}.`);
        }

        const { isLobby } = this.proxy;

        const state = isLobby ?
            'В лобби'
            :
            `На сервере ${this.proxy.currentServer}`;

        this.setActivity({
            state
            /*...(
                !isLobby &&
                {
                    partyId: this.proxy.currentServer,
                    joinSecret: 'SteveProxy',
                    buttons: undefined
                }
            )*/
        });
    }

    #login(): void {
        const reconnectAttempts = this.#reconnectAttempts;

        this.#client.login({
            clientId: '818385655691214868'
        })
            .catch((error) => {
                console.error(error);

                if (this.#reconnectAttempts) {
                    setTimeout(() => (
                        this.#login()
                    ), (reconnectAttempts + 1 - this.#reconnectAttempts) * 1_000);

                    return this.#reconnectAttempts--;
                }

                this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при авторизации!`);
            });
    }

    setActivity(activity: Presence): void {
        const updatedActivity = {
            ...this.#activity,
            ...activity
        };

        if (JSON.stringify(this.#activity) !== JSON.stringify(updatedActivity)) {
            this.#activity = updatedActivity;

            this.#client.setActivity(updatedActivity);
        }
    }

    stop(): void {
        this.#client.destroy();
    }

    clear() {
        this.ready(true);
    }
}
