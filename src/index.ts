import { createServer } from "minecraft-protocol";

import { events } from "./events";
import { config } from "./config";

import { IClient } from "./interfaces";

import "./lobby";

const { proxy } = config;

const server = createServer(proxy);

console.log("[Steve] Starting...");

events.forEach((Event) => {
    const event = new Event();

    // @ts-ignore
    server.on(event.name, (client: IClient) => event.handler(client, server));
});
