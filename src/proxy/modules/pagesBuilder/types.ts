import { ComponentsUnion } from 'rawjsonbuilder';

import { PacketContext } from '../packetManager';
import { Page, NBT } from './components';

import { IItem } from '../context';

export type RawPage = Page | (() => Page) | (() => Promise<Page>);

export enum Inventory {
    GENERIC_9X1 = 'generic_9x1',
    GENERIC_9X2 = 'generic_9x2',
    GENERIC_9X3 = 'generic_9x3',
    GENERIC_9X4 = 'generic_9x4',
    GENERIC_9X5 = 'generic_9x5',
    GENERIC_9X6 = 'generic_9x6',
    GENERIC_3X3 = 'generic_3X3',
    ANVIL = 'anvil',
    BEACON = 'beacon',
    BLAST_FURNACE = 'blast_furnace',
    BREWING_STAND = 'brewing_stand',
    CRAFTING = 'crafting',
    ENCHANTMENT = 'enchantment',
    FURNACE = 'furnace',
    GRINDSTONE = 'grindstone',
    HOPPER = 'hopper',
    LECTERN = 'lectern',
    LOOM = 'loom',
    MERCHANT = 'merchant',
    SHULKER_BOX = 'shulker_box',
    SMITHING = 'smithing',
    SMOKER = 'smoker',
    CARTOGRAPHY = 'cartography',
    STONECUTTER = 'stonecutter'
}
export type InventoryIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;

export interface IItemConstructor {
    id: number;
    damage?: number;
    position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63; // RangeOf<0, 63>
    count?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63 | 64; // RangeOf<1, 64>
    nbt?: NBT;
    onClick?: (context: PacketContext) => void;
}

export enum NBTType {
    BYTE = 'byte',
    SHORT = 'short',
    INT = 'int',
    LONG = 'long',
    FLOAT = 'float',
    DOUBLE = 'double',
    BYTE_ARRAY = 'byteArray',
    STRING = 'string',
    LIST = 'list',
    COMPOUND = 'compound',
    INT_ARRAY = 'intArray',
    LONG_ARRAY = 'longArray'
}

export enum ButtonAction {
    FIRST = 'first',
    BACK = 'back',
    STOP = 'stop',
    NEXT = 'next',
    LAST = 'last'
}
export type Buttons = {
    [key in ButtonAction]?: Omit<IItemConstructor, 'id'> & Partial<Pick<IItemConstructor, 'id'>>;
};

export interface IPage {
    windowTitle?: ComponentsUnion;
    items?: IItem[];
    triggers?: Map<number, (context: PacketContext) => unknown>;
}

export interface IAutoGeneratePagesOptions {
    items: Omit<IItemConstructor, 'position'>[];
    windowTitle?: IPage['windowTitle'];
}
