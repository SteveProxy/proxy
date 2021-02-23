import { Client } from "minecraft-protocol";

import { IContext } from "./Context";

export interface IClient extends Client {
    context: IContext;
    compressionThreshold: number;
}
