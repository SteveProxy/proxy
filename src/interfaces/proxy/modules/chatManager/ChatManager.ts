import { ChatBuilder } from "../../../../proxy/modules/chatManager/ChatBuilder";
import { PacketContext } from "../../../../proxy/modules/packetManager/PacketContext";

export type BuildersStorage = Map<string, ChatBuilder>;

export type Middleware = (message: PacketContext) => unknown;
export type FallbackHandler = (() => unknown) | undefined | null;

export * from "./ChatBuilder";