import { IPlugin } from "../../interfaces";
import { Proxy } from "../Proxy";

export class Plugin {

    meta: IPlugin;
    proxy: Proxy;

    constructor(proxy: Proxy, meta: IPlugin) {
        this.proxy = proxy;
        this.meta = meta;
    }

}
