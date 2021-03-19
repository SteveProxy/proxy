export interface IPlugin {
    name: string;
    description: string;
    prefix: string;
    commands?: ICommand[];
    ignorePluginPrefix?: boolean;
    hidden?: boolean;
}

export interface ICommand {
    name: string;
    handler(...args: any): void;
    args?: string[];
    hidden?: boolean;
}
