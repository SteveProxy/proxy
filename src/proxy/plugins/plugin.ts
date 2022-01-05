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

export class Plugin<C extends Record<string, any> | undefined = undefined> {

    meta: IPlugin;
    proxy: Proxy;

    protected constructor(proxy: Proxy, meta: IPluginMeta, defaultConfig?: C) {
        this.proxy = proxy;

        meta.commands ||= [];
        meta.prefix = `${meta.prefix}§r §f|`;

        this.meta = meta as IPlugin;

        if (defaultConfig && !this.proxy.userConfig.plugins?.[this.meta.name]) {
            this.updateConfig(defaultConfig);
        }
    }

    updateConfig(updates: Partial<C>): void {
        if (!this.proxy.userConfig.plugins) {
            this.proxy.userConfig.plugins = {};
        }

        const plugin = this.proxy.userConfig.plugins[this.meta.name];

        this.proxy.userConfig.plugins[this.meta.name] = {
            ...plugin,
            ...updates
        };

        this.proxy.user.write();
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    start(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    stop(): void {}

    restart(): void {
        this.stop();
        this.start();
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    clear(): void {}
}
