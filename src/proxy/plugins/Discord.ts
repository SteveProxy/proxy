import { Client } from "discord-rpc";

import { Plugin } from "./Plugin";
import { Proxy } from "../Proxy";

import { config } from "../../config";

export class Discord extends Plugin {

    private client: Client = new Client({ transport: "ipc" });

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "discord",
            description: "Discord интеграция",
            prefix: "§9§lDiscord§r §f|"
        });
    }

    start(): void {
        const client = this.client;

        client.on("ready", () => {
            client.setActivity({
                largeImageKey: "minecraft",
                largeImageText: `Minecraft ${config.proxy.version}`,
                smallImageKey: "steve",
                smallImageText: "SteveProxy",
                details: config.bridge.connect,
                startTimestamp: Date.now()
            });

            this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${client.user.username}.`);
        });

        client.login(config.plugins.discord)
            .catch((error) => {
                this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при авторизации!`);

                console.error(error);
            });
    }

    stop(): void {
        this.client.destroy();
    }
}