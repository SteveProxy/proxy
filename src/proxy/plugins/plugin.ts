import { db, IConfig } from '../../config';

import { Proxy } from '../';

export interface IPluginMeta {
    name: string;
    description: string;
    prefix: string;
    commands?: ICommand[];
    ignorePluginPrefix?: boolean;
    hidden?: boolean;
}
export interface IPlugin extends IPluginMeta {
    cooldown: VoidFunction;
}
export interface ICommand {
    name: string;
    description: string;
    args?: string[];
    argsRequired?: boolean;
    hidden?: boolean;
    cooldown?: number;
    ignorePluginPrefix?: boolean;
    sliceArgs?: boolean;
    handler(...args: any[]): void;
}

type ConfigPluginUnion =
    'vk'
    | 'discord'
    | 'spotify';

export type PluginConfigFactory<N extends ConfigPluginUnion> = IConfig['plugins'][N];

export class Plugin<C extends IConfig['plugins'][keyof IConfig['plugins']] | undefined = undefined> {

    meta: IPlugin;
    proxy: Proxy;

    protected constructor(proxy: Proxy, meta: IPluginMeta, defaultConfig?: C) {
        this.proxy = proxy;

        meta.commands ||= [];
        meta.prefix = `${meta.prefix}§r §f|`;

        this.meta = meta as IPlugin;

        // @ts-ignore
        if (defaultConfig && !this.proxy.config.plugins[this.meta.name]) {
            // @ts-ignore
            this.updateConfig(defaultConfig);
        }
    }

    updateConfig(updates: Partial<C>): void {
        // @ts-ignore
        db.data!.plugins[this.meta.name] = {
            // @ts-ignore
            ...db.data!.plugins[this.meta.name],
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
