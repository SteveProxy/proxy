import { ServerOptions } from "minecraft-protocol";

import { ISpotify } from "./proxy/plugins/Spotify";
import { IDiscord } from "./proxy/plugins/Discord";
import { IParsedIP } from "./Utils";

export interface IConfig {
    proxy: ServerOptions & IParsedIP & {
        version: string;
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
    };
}
