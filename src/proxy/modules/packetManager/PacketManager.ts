import { EventEmitter } from 'events';

import { PacketContext } from './PacketContext';
import { Proxy } from '../../Proxy';

import { config } from '../../../config';

import { IPacketSwindlerOptions } from '../../../interfaces';

export class PacketManager extends EventEmitter {

    protected proxy: Proxy;

    private currentPacketTime = 0;
    private packetDelta = 0;

    constructor(proxy: Proxy) {
        super();

        this.proxy = proxy;
    }

    packetSwindler({ packet, meta, isFromServer, send }: IPacketSwindlerOptions): void {
        if (!config.bridge.ignoredPackets.includes(meta.name)) {
            const previousPacketTime = this.currentPacketTime;

            this.currentPacketTime = new Date()
                .getTime();
            this.packetDelta = previousPacketTime ?
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

            this.emit('packet', context);
            this.emit(meta.name, context);

            if (!context.isCanceled()) {
                send(context.packet);
            }
        }
    }

    once(events: string | symbol | (string | symbol)[], listener: (context: PacketContext) => void): this {
        events = Array.isArray(events) ? events : [events];

        events.forEach((event) => {
            super.once(event, listener);
        });

        return this;
    }

    on(events: string | symbol | (string | symbol)[], listener: (context: PacketContext) => void): this {
        events = Array.isArray(events) ? events : [events];

        events.forEach((event) => {
            super.on(event, listener);
        });

        return this;
    }

    clear(): void {
        this.removeAllListeners();
    }
}

export {
    PacketContext
};
