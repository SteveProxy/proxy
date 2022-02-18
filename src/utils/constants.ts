import _minecraftData from 'minecraft-data';

import { config } from '../config';

import packageMeta from '../../package.json' assert { type: 'json' };

export const { version } = packageMeta;

export const USERS_DATA_PATH = './users';
export const SOCKET_CLOSED_EVENT = 'socketclosed';

export const TEXTURES_ENDPOINT = 'http://textures.minecraft.net/texture/';
export const MINECRAFT_API_ENDPOINT = 'https://api.minecraftservices.com/minecraft/profile/skins';
export const ASHCON_API_ENDPOINT = 'https://api.ashcon.app/mojang/v2';

export const minecraftData = _minecraftData(config.data!.proxy.version);

// @ts-ignore Invalid lib types
export const LOBBY_LOGIN_PACKET = { ...minecraftData.loginPacket };

LOBBY_LOGIN_PACKET.isHardcore = true;
LOBBY_LOGIN_PACKET.gameMode = 0;
LOBBY_LOGIN_PACKET.dimension.value.infiniburn.value = 'minecraft:infiniburn_end';
LOBBY_LOGIN_PACKET.dimension.value.effects.value = 'minecraft:the_end';

export const nameRegExp = /^([a-z0-9_]{1,16}|[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{8}[0-9a-f]{4}[0-5][0-9a-f]{3}[089ab][0-9a-f]{3}[0-9a-f]{12})$/gi;
