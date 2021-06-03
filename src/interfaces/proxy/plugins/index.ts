import { IConfig } from "../../Config";

// @ts-ignore
export type PluginConfigFactory<N extends string> = IConfig["plugins"][N];

export * from "./Plugin";
export * from "./Core";
export * from "./Spotify";
export * from "./VK";
export * from "./Discord";
export * from "./Skin";
export * from "./Chat";
