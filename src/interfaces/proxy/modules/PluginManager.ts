import { ICommand, IPluginMeta } from '../plugins';

export type CommandsMap = Map<string, Omit<ICommand, 'name' | 'description'> & {
    pluginName: string;
}>;
export type PluginsMap = Map<string, any>;
export type CooldownsMap = Map<string, number>;

export interface ICooldownOptions {
    command: IPluginMeta['name'];
    cooldown: number;
}
