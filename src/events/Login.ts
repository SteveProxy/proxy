import { Server } from "minecraft-protocol";

import { Event } from "./Event";
import { Proxy } from "../proxy/Proxy";

import { IClient, IConfig } from "../interfaces";

import config from "../../config.json";

const { bridge: { whitelist, connect } }: IConfig = config;

export class Login extends Event<"login"> {

    constructor() {
        super("login");
    }

    handler(client: IClient, server: Server): void {
        const { uuid, username } = client;

        const proxy = new Proxy({ server, client, config });

        if (whitelist.length && !(
            whitelist.includes(uuid) ||
            whitelist.includes(uuid.replace("-", "")) ||
            whitelist.includes(username))
        ) {
            return proxy.client.context.end("Вас нет в белом списке сервера!"); // kick_disconnect doesnt work on 1.16.5
        }

        proxy.connect(connect);
    }
}
