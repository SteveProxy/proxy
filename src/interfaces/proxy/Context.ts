import { RawJSONBuilder } from "rawjsonbuilder";

export type Title = ITitle | string;

interface ITitle {
    title?: string;
    subtitle?: string;
    actionbar?: string;
    fadeIn?: number;
    fadeOut?: number;
    stay?: number;
    hide?: boolean;
    reset?: boolean;
}

export type Tab = ITab;

interface ITab {
    header?: RawJSONBuilder;
    footer?: RawJSONBuilder;
}

export interface IOpenWindow {
    windowId: number;
    inventoryType: number;
    windowTitle?: RawJSONBuilder;
    items: IItem[];
}

export interface IItem {
    present: boolean;
    itemId: number;
    itemDamage?: number;
    itemCount?: number;
    nbtData?: any;
}
