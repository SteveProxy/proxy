import { MessageContext, ContextSubTypes, ContextTypes } from 'vk-io';

import { IPluginMeta, Proxy } from '../../../';
import { VK } from '../vk';

export interface IRootMiddlewareOptions {
    name: ContextTypes | ContextSubTypes;
    proxy: Proxy;
    meta: IPluginMeta;
    vk: VK;
}
export interface IMiddlewareOptions extends Pick<IRootMiddlewareOptions, 'proxy' | 'meta' | 'vk'> {}

export abstract class Middleware {

    readonly name: ContextTypes | ContextSubTypes;

    readonly meta: IPluginMeta;
    readonly proxy: Proxy;
    readonly vk: VK;

    protected constructor({ name, proxy, meta, vk }: IRootMiddlewareOptions) {
        this.name = name;

        this.proxy = proxy;
        this.meta = meta;
        this.vk = vk;
    }

    abstract handler(context: MessageContext, next: VoidFunction): void | Promise<void>
}
