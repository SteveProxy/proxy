import { ICommand } from "../plugins/Plugin";

export type CommandsMap = Map<string, Omit<ICommand, "name" | "description"> & {
    pluginName: string;
}>;
export type PluginsMap = Map<string, any>;