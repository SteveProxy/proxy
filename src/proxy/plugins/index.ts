import { Core } from "./Core/Core";
import { Spotify } from "./Spotify/Spotify";
import { Skin } from "./Skin/Skin";
import { Discord } from "./Discord/Discord";
import { Names } from "./Names/Names";
import { Chat } from "./Chat/Chat";

export const plugins = <const>[
    Core,
    Spotify,
    Skin,
    Discord,
    Names,
    Chat
];
