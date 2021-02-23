import { Server } from "minecraft-protocol";

import { Event } from "./Event";
import { Proxy } from "../proxy/Proxy";

import { IClient, IConfig } from "../interfaces";

import config from "../../config.json";

const { bridge: { whitelist, connect } }: IConfig = config;

export class Login extends Event {

    constructor() {
        super("login");
    }

    async handler(client: IClient, server: Server): Promise<void> {
        const { uuid, username } = client;

        if (whitelist.length && !(
            whitelist.includes(uuid) ||
            whitelist.includes(uuid.replace("-", "")) ||
            whitelist.includes(username))
        ) {
            return client.context.end("Вас нет в белом списке сервера!"); // kick_disconnect doesnt work on 1.16.5
        }

        const proxy = new Proxy({ server, client, config });

        await proxy.connect(connect);
    }
}
