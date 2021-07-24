import { MessageContext, ContextSubTypes, ContextTypes } from 'vk-io';
import { IMiddlewareOptions, IPluginMeta } from '../../../../interfaces';
import { Proxy } from '../../../Proxy';
import { VK } from '../API';

export abstract class Middleware {

    readonly name: ContextTypes | ContextSubTypes;

    readonly meta: IPluginMeta;
    readonly proxy: Proxy;
    readonly vk: VK

    protected constructor({ name, proxy, meta, vk }: IMiddlewareOptions) {
        this.name = name;

        this.proxy = proxy;
        this.meta = meta;
        this.vk = vk;
    }

    abstract handler(context: MessageContext, next: VoidFunction): void | Promise<void>
}
