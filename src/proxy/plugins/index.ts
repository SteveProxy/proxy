import { Core } from './Core';
import { Spotify } from './Spotify';
import { VK } from './VK';
import { Skin } from './Skin';
import { Discord } from './Discord';
import { Names } from './Names';
import { Chat } from './Chat';

export const plugins = <const>[
    Core,
    Spotify,
    VK,
    Skin,
    Discord,
    Names,
    Chat
];

export * from './plugin';

export * from './VK';
export * from './Chat';
export * from './Skin';
export * from './Core';
export * from './Names';
export * from './Discord';
export * from './Spotify';
