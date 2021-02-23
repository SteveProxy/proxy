import { createServer } from "minecraft-protocol";

import { Context } from "./proxy/modules/Context";

import { events } from "./events";
import { config } from "./config";

const { proxy } = config;

const server = createServer(proxy);

console.log("[Steve] Starting...");

events.forEach((Event) => {
    const { name, handler } = new Event();

    // @ts-ignore
    server.on(name, (client) => {
        if (client?.username) {
            Context.wrap(client);
        }

        handler(client, server);
    });
});
