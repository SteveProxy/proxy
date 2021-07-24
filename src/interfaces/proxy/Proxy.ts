import { Server, PacketMeta } from 'minecraft-protocol';

import { IClient } from './Client';
import { Proxy } from '../../proxy/Proxy';

export interface IProxyOptions {
    server: Server;
    client: IClient;
}

export interface IPacketSwindlerOptions {
    packet: any;
    meta: PacketMeta;
    isFromServer: boolean;
    send: (data: any) => unknown;
}

export interface IPacketContextOptions {
    packet: any;
    meta: PacketMeta;
    isFromServer: boolean;
    proxy: Proxy;
    packetDelta: number;
    packetDate: number;
}
