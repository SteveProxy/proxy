import { IConfig } from '../../Config';

type ConfigPluginUnion =
    'vk'
    | 'discord'
    | 'spotify';

export type PluginConfigFactory<N extends ConfigPluginUnion> = IConfig['plugins'][N];

export * from './Plugin';
export * from './Core';
export * from './Spotify';
export * from './VK';
export * from './Discord';
export * from './Skin';
export * from './Chat';
