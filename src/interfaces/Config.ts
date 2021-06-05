import { ServerOptions } from "minecraft-protocol";

import { ISpotify, IDiscord, IVK } from "./proxy";

import { IParsedIP } from "./Utils";

export interface IConfig {
    proxy: ServerOptions & IParsedIP & {
        version: string;
        favicon: string;
        description: string[];
    };
    lobby: IParsedIP;
    bridge: {
        whitelist: string[];
        prefix: string;
        title: string;
        ignoredPackets: string[];
    };
    plugins: {
        spotify: ISpotify;
        discord: IDiscord;
        vk: IVK;
    };
}
