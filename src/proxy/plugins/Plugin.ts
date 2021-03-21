import { IPlugin } from "../../interfaces";
import { Proxy } from "../Proxy";

export class Plugin {

    meta: IPlugin;
    proxy: Proxy;

    constructor(proxy: Proxy, meta: IPlugin) {
        this.proxy = proxy;

        meta.commands ||= [];

        this.meta = meta;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    start(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    stop(): void {}
}
