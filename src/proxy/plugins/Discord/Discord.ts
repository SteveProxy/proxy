import { Client, Presence } from "discord-rpc";

import { Plugin } from "../Plugin";
import { Proxy } from "../../Proxy";

export class Discord extends Plugin {

    private client: Client = new Client({ transport: "ipc" });
    private activity: Presence;
    private reconnectAttempts = 3;
    private activityUpdatesInterval?: NodeJS.Timeout;

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "discord",
            description: "Discord интеграция",
            prefix: "§9§lDiscord"
        });

        const { proxy: { version } } = this.proxy.config;

        this.activity = {
            largeImageKey: "minecraft",
            largeImageText: `Minecraft ${version}`,
            smallImageKey: "steve",
            smallImageText: `SteveProxy | ${this.proxy.client.username}`,
            startTimestamp: Date.now()
        };
    }

    start(): void {
        const client = this.client;

        client.on("ready", () => {
            this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${client.user.username}.`);

            this.startActivityUpdates();
        });

        this.login();
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

    private startActivityUpdates() {
        this.activityUpdatesInterval = setInterval(() => {
            const details = this.proxy.currentServer === this.proxy.fallbackServer ?
                "В лобби"
                :
                this.proxy.currentServer;

            this.setActivity({
                details
            });
        }, 1_000);
    }

    private setActivity(activity: Presence) {
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

        if (this.activityUpdatesInterval) {
            clearInterval(this.activityUpdatesInterval);
        }
    }
}
