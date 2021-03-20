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
    description: string;
    args?: string[];
    hidden?: boolean;
    handler(...args: any): void;
}
