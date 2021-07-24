import { PacketMeta } from 'minecraft-protocol';

import { Proxy } from '../../Proxy';

import { IPacketContextOptions } from '../../../interfaces';

export class PacketContext {

    packet: any;
    meta: PacketMeta;
    isFromServer: boolean;
    proxy: Proxy;

    canceled: boolean;
    from: 'server' | 'client';
    packetDate: number;
    packetDelta: number;

    constructor({ packet, meta, isFromServer, proxy, packetDelta, packetDate }: IPacketContextOptions) {
        this.packet = packet;
        this.meta = meta;
        this.proxy = proxy;
        this.isFromServer = isFromServer;

        this.canceled = false;
        this.from = isFromServer ? 'server' : 'client';
        this.packetDate = packetDate;
        this.packetDelta = packetDelta;
    }

    setCanceled(cancel = true): this {
        this.canceled = cancel;

        return this;
    }

    isCanceled(): boolean {
        return this.canceled;
    }

    clone(): PacketContext {
        return new PacketContext(this);
    }

    send(): void {
        if (!this.isFromServer) {
            this.proxy.bridge.write(this.meta.name, this.packet);
        } else {
            this.proxy.client.write(this.meta.name, this.packet);
        }
    }
}
