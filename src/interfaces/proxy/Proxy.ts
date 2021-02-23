import { Server, PacketMeta } from "minecraft-protocol";

import { IClient } from "./Client";
import { IConfig } from "../Config";
import { Proxy } from "../../proxy/Proxy";

export interface IProxyOptions {
    server: Server;
    client: IClient;
    config: IConfig;
}

export interface IPacketSwindlerOptions {
    packet: any;
    meta: PacketMeta;
    isFromServer: boolean;
    send(data: any): void;
}

export interface IPacketContextOptions {
    packet: any;
    meta: PacketMeta;
    isFromServer: boolean;
    proxy: Proxy;
    packetDelta: number;
    packetDate: number;
}
