import { ContextSubTypes, ContextTypes } from 'vk-io';
import { Proxy } from '../../../proxy/Proxy';
import { IPluginMeta } from './Plugin';
import { VK } from '../../../proxy/plugins/VK/API';
import { GroupsGroupFull, MessagesConversation } from 'vk-io/lib/api/schemas/objects';

export interface IVK {
    token: string;
    user: number;
    scope: string[];
}

export interface IMiddlewareOptions {
    name: ContextTypes | ContextSubTypes;
    proxy: Proxy;
    meta: IPluginMeta;
    vk: VK;
}

export interface IProfile {
    name: string;
}

export type MultipleResource = (GroupsGroupFull | IProfile) & MessagesConversation;

