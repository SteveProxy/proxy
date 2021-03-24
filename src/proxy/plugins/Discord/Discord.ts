import { Client } from "discord-rpc";

import { Plugin } from "../Plugin";
import { Proxy } from "../../Proxy";

export class Discord extends Plugin {

    private client: Client = new Client({ transport: "ipc" });

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "discord",
            description: "Discord интеграция",
            prefix: "§9§lDiscord"
        });
    }

    start(): void {
        const client = this.client;
        const { proxy: { version }, lobby: { host, port }, plugins: { discord } } = this.proxy.config;

        client.on("ready", () => {
            client.setActivity({
                largeImageKey: "minecraft",
                largeImageText: `Minecraft ${version}`,
                smallImageKey: "steve",
                smallImageText: `SteveProxy | ${this.proxy.client.username}`,
                details: `${host}:${port}`,
                startTimestamp: Date.now()
            });

            this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${client.user.username}.`);
        });

        client.login(discord)
            .catch((error) => {
                this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при авторизации!`);

                console.error(error);
            });
    }

    stop(): void {
        this.client.destroy();
    }
}