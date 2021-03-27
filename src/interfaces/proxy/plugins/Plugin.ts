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
    hidden?: boolean;
    cooldown?: number;
    ignorePluginPrefix?: boolean;
    handler(...args: any): void;
}
