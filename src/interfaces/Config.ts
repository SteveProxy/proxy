import { ServerOptions } from "minecraft-protocol";

import { ISpotify } from "./proxy/plugins/Spotify";

export interface IConfig {
    proxy: ServerOptions;
    bridge: {
        whitelist: string[];
        prefix: string;
        title: string;
        connect: string;
        ignoredPackets: string[];
    };
    plugins: {
        spotify: ISpotify
    };
}
