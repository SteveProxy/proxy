import { ICommand } from "../plugins/Plugin";

export type CommandsMap = Map<string, Omit<ICommand, "name">>;