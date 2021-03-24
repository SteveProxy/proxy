import { NBT } from "../components/NBT";

import { Item } from "../components/Item";

import { minecraftData } from "../../../../utils";

import { IItemConstructor, IPlayerHeadOptions } from "../../../../interfaces";

export function PlayerHead(options: IPlayerHeadOptions): Omit<IItemConstructor, "position">;
export function PlayerHead(options: IPlayerHeadOptions & { position: IItemConstructor["position"] }): Item;
export function PlayerHead({ name, lore, onClick, position, value, url }: IPlayerHeadOptions): Item | Omit<IItemConstructor, "position"> {
    const itemOptions = {
        id: minecraftData.findItemOrBlockByName("player_head").id,
        nbt: new NBT("compound", {
            display: new NBT("compound", {
                Name: name ?
                    new NBT("string", name)
                    :
                    undefined,
                Lore: lore ?
                    new NBT("list", new NBT("string", lore))
                    :
                    undefined
            }),
            SkullOwner: new NBT("compound", {
                Name: new NBT("string", "head"),
                Properties: new NBT("compound", {
                    textures: new NBT("list", new NBT("compound", [{
                        Value: new NBT("string", value || Buffer.from(
                            JSON.stringify({
                                textures: {
                                    SKIN: {
                                        url
                                    }
                                }
                            })
                        )
                            .toString("base64"))
                    }]))
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
    } else {
        return itemOptions;
    }
}

export enum Head {
    Server = "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvY2NhNDVlZjU4MjFhOGIxMDdjYmZiYTdkNjZlOTk3ZmI2YWJlNTUyMWMxNTVjZWUyZjI0YjM0YjNkOTFhNSJ9fX0="
}