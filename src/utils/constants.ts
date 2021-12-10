import _minecraftData from 'minecraft-data';

import { config } from '../config';

import packageMeta from '../../package.json';

export const TEXTURES_ENDPOINT = 'http://textures.minecraft.net/texture/';
export const MINECRAFT_API_ENDPOINT = 'https://api.minecraftservices.com/minecraft/profile/skins';
export const ASHCON_API_ENDPOINT = 'https://api.ashcon.app/mojang/v2';

export const minecraftData = _minecraftData(config.proxy.version as string);

export const nameRegExp = /^([a-z0-9_]{1,16}|[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{8}[0-9a-f]{4}[0-5][0-9a-f]{3}[089ab][0-9a-f]{3}[0-9a-f]{12})$/gi;

export const { version } = packageMeta;
