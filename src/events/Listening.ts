import { Server } from "minecraft-protocol";

import { Event } from "./Event";

import { IClient } from "../interfaces";

export class Listening extends Event {

    constructor() {
        super("listening");
    }

    handler(client: IClient, server: Server): void {
        // @ts-ignore Invalid lib type
        const { address, port } = server.socketServer.address();

        console.log(`[Steve] Proxy started on ${address}:${port}`);
    }
}
