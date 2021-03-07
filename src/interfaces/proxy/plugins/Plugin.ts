export interface IPlugin {
    name: string;
    description: string;
    prefix: string;
    commands?: ICommand[];
}

export interface ICommand {
    name: string;
    handler(...args: any): void;
    hasArguments?: boolean;
}
