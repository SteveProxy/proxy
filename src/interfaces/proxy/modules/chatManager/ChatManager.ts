import { ChatBuilder, PacketContext } from '../../../../proxy/modules';

export type BuildersStorage = Map<string, ChatBuilder>;

export type Middleware = (message: PacketContext) => unknown;
export type FallbackHandler = (() => unknown) | undefined | null;

export * from './ChatBuilder';