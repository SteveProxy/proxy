import { Item, NBT, Page } from "../../../../proxy/modules";
// import { RangeOf } from "../Utils";
import { PacketContext } from "../../../../proxy/modules";
import { ComponentsUnion } from "rawjsonbuilder";
import { IItem } from "../Context";

export type RawPage = Page | (() => Page) | (() => Promise<Page>);

export type Inventory = "generic_9x1" | "generic_9x2" | "generic_9x3" | "generic_9x4" | "generic_9x5" | "generic_9x6" | "generic_3x3" | "anvil" | "beacon" | "blast_furnace" | "brewing_stand" | "crafting" | "enchantment" | "furnace" | "grindstone" | "hopper" | "lectern" | "loom" | "merchant" | "shulker_box" | "smoker" | "cartography" | "stonecutter";

export interface IItemConstructor {
    id: number;
    damage?: number;
    position: number; // RangeOf<0, 63>
    count?: number; // RangeOf<1, 64>
    nbt?: NBT;
    onClick?: (context: PacketContext) => void;
}

export type NBTType = "byte" | "short" | "int" | "long" | "float" | "double" | "byteArray" | "string" | "list" | "compound" | "intArray" | "longArray";

export type ButtonAction = "first" | "back" | "stop" | "next" | "last";
export type Buttons = {
    [key in ButtonAction]?: {
        id?: number;
        position: number; // RangeOf<0, 63>
        onClick?: (context: PacketContext) => void;
        count?: number; // RangeOf<1, 64>
        nbt?: NBT;
    }
};
export type DefaultButtonsMap = Map<ButtonAction, Item>;

export interface IPage {
    windowTitle?: ComponentsUnion;
    items?: IItem[];
    triggers?: Map<number, (context: PacketContext) => unknown>;
}

export interface IAutoGeneratePagesOptions {
    items: Omit<IItemConstructor, "position">[];
    windowTitle?: IPage["windowTitle"];
}

export * from "./gui/Slider";
export * from "./gui/PlayerHead";
