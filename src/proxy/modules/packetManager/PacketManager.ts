import { EventEmitter } from "events";

import { PacketContext } from "./PacketContext";
import { Proxy } from "../../Proxy";

import { IPacketSwindlerOptions } from "../../../interfaces";

export class PacketManager extends EventEmitter {

    protected proxy: Proxy;

    private currentPacketTime: number;
    private packetDelta: number;

    constructor(proxy: Proxy) {
        super();

        this.proxy = proxy;

        this.currentPacketTime = 0;
        this.packetDelta = 0;
    }

    packetSwindler({ packet, meta, isFromServer, send }: IPacketSwindlerOptions): void {
        if (!this.proxy.config.bridge.ignoredPackets.includes(meta.name)) {
            const previousPacketTime = this.currentPacketTime;

            this.currentPacketTime = new Date()
                .getTime();
            this.packetDelta = !previousPacketTime ?
                this.currentPacketTime - previousPacketTime
                :
                0;

            const context = new PacketContext({
                packet,
                meta,
                isFromServer,
                packetDelta: this.packetDelta,
                packetDate: this.currentPacketTime,
                proxy: this.proxy
            });

            this.emit("packet", context);
            this.emit(meta.name, context);

            if (!context.isCanceled()) {
                send(context.packet);
            }
        }
    }

    stop(): void {
        this.removeAllListeners();
    }
}

export interface PacketManager {
    on(event: string | symbol, listener: (context: PacketContext) => void): this;

    once(event: string | symbol, listener: (context: PacketContext) => void): this;
}

export {
    PacketContext
};
