import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../../proxy/Proxy";
import { PagesBuilder } from "../../proxy/modules/pagesBuilder/PagesBuilder";

export interface IContext {
    end(reason: string): void;
    send(message: RawJSONBuilder | string): void;
    sendTitle(params: Title): void;
    sendTab(params: Tab): void;
    openWindow(params: IOpenWindow): void;
    pagesBuilder(proxy: Proxy): PagesBuilder;
    dropItem(): void;
}

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
