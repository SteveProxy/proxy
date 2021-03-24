import { createServer } from "minecraft-protocol";

import { events } from "./events";
import { config } from "./config";

import { IClient } from "./interfaces";

/*import "./lobby";*/

const { proxy } = config;

const server = createServer(proxy);

console.log("[Steve] Starting...");

events.forEach((Event) => {
    const { name, handler } = new Event();

    // @ts-ignore
    server.on(name, (client: IClient) => handler(client, server));
});
