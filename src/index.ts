import { createServer } from "minecraft-protocol";

import { Context } from "./proxy/modules/Context";

import { events } from "./events";
import { config } from "./config";

const { proxy } = config;

const server = createServer(proxy);

console.log("[Steve] Starting...");

events.forEach((Event) => {
    const { name, handler } = new Event();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    server.on(name, (data) => {
        if (data?.username) {
            Context.wrap(data);
        }

        handler(data, server);
    });
});
