import { RawJSONBuilder } from "rawjsonbuilder";

export type SendTitleOptions = ITitle | string;

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

export type ISendTabOptions = ITab;

interface ITab {
    header?: RawJSONBuilder;
    footer?: RawJSONBuilder;
}

export interface IOpenWindowOptions {
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