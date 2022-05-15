import { ComponentsUnion } from 'rawjsonbuilder';

import { NBT, Item } from '../components';

import { minecraftData } from '../../../../utils';

import { IItemConstructor } from '../types';

export interface IPlayerHeadOptions {
    name?: ComponentsUnion;
    lore?: ComponentsUnion[];
    onClick?: Item['onClick'];
    position?: Item['position'];
    value?: string;
    url?: string;
}

export function PlayerHead(options: IPlayerHeadOptions): Omit<IItemConstructor, 'position'>;
export function PlayerHead(options: IPlayerHeadOptions & { position: IItemConstructor['position'] }): Item;
export function PlayerHead({ name, lore, onClick, position, value, url }: IPlayerHeadOptions): Item | Omit<IItemConstructor, 'position'> {
    const itemOptions = {
        id: minecraftData.itemsByName['player_head'].id,
        nbt: NBT.compound({
            display: NBT.compound({
                Name: name ?
                    NBT.string(name)
                    :
                    undefined,
                Lore: lore ?
                    NBT.list(
                        NBT.string(lore)
                    )
                    :
                    undefined
            }),
            SkullOwner: NBT.compound({
                Name: NBT.string('head'),
                Properties: NBT.compound({
                    textures: NBT.list(
                        NBT.compound([{
                            Value: NBT.string(
                                value || Buffer.from(
                                    JSON.stringify({
                                        textures: {
                                            SKIN: {
                                                url
                                            }
                                        }
                                    })
                                )
                                    .toString('base64')
                            )
                        }])
                    )
                })
            })
        }),
        onClick
    };

    if (position) {
        return new Item({
            ...itemOptions,
            position
        });
    }

    return itemOptions;
}

export enum Head {
    SERVER = 'eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvY2NhNDVlZjU4MjFhOGIxMDdjYmZiYTdkNjZlOTk3ZmI2YWJlNTUyMWMxNTVjZWUyZjI0YjM0YjNkOTFhNSJ9fX0='
}
