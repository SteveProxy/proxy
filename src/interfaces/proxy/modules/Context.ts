import { ComponentsUnion, RawComponentsUnion } from 'rawjsonbuilder';

import { Proxy } from '../../../proxy/Proxy';
import { IClient } from '../Client';

export interface IContext {
    proxy: Proxy;
    client: IClient;
    type: 'client' | 'bridge';
}

interface ISendOptions {
    message: ComponentsUnion | string;
    position?: number;
    sender?: string;
    useRawJSON?: boolean;
}

export type SendOptions = ISendOptions | ISendOptions['message'];

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
    header?: ComponentsUnion | RawComponentsUnion;
    footer?: ComponentsUnion | RawComponentsUnion;
}

export interface IOpenWindowOptions {
    windowId: number;
    inventoryType: number;
    windowTitle?: ComponentsUnion;
    items: IItem[];
}

export interface IItem {
    present: boolean;
    itemId: number;
    itemDamage?: number;
    itemCount?: number;
    nbtData?: any;
}

export type SetCooldownOptions = ISetCooldownOptions['id'] | ISetCooldownOptions;

export interface ISetCooldownOptions {
    id: number | number[];
    cooldown?: number;
}