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
    handler(...args: any): void;
}
