import { Client } from "minecraft-protocol";

import { Context } from "../../proxy/modules/Context";

export interface IClient extends Client {
    ended: boolean;
    context: Context;
    compressionThreshold: number;
}
