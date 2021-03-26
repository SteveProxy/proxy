import { IPlugin, IPluginMeta } from "../../interfaces";
import { Proxy } from "../Proxy";

export class Plugin {

    meta: IPlugin;
    proxy: Proxy;

    protected constructor(proxy: Proxy, meta: IPluginMeta) {
        this.proxy = proxy;

        meta.commands ||= [];
        meta.prefix = `${meta.prefix}§r §f|`;

        this.meta = meta as IPlugin;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    start(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    stop(): void {}
}
