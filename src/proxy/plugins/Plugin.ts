import { db } from "../../DB";

import { IConfig, IPlugin, IPluginMeta } from "../../interfaces";
import { Proxy } from "../Proxy";

export class Plugin<C extends IConfig["plugins"][keyof IConfig["plugins"]] | undefined = undefined> {

    meta: IPlugin;
    proxy: Proxy;

    protected constructor(proxy: Proxy, meta: IPluginMeta) {
        this.proxy = proxy;

        meta.commands ||= [];
        meta.prefix = `${meta.prefix}§r §f|`;

        this.meta = meta as IPlugin;
    }

    updateConfig(updates: Partial<C>): void {
        // @ts-ignore
        (db.data as IConfig).plugins[this.meta.name] = { // @ts-ignore
            ...(db.data as IConfig).plugins[this.meta.name],
            ...updates
        };

        db.write();
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    start(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    stop(): void {}

    restart(): void {
        this.stop();
        this.start();
    }
}
