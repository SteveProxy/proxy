import { ChatBuilder } from "./ChatBuilder";
import { PluginManager } from "../PluginManager";

import { BuildersStorage, FallbackHandler, ITrigger, Middleware, StringButton } from "../../../interfaces";
import { PacketContext } from "../packetManager/PacketContext";

const buildersStorage: BuildersStorage = new Map();

class ChatManager {

    fallbackHandler: FallbackHandler;
    static prefix = `${PluginManager.prefix}chatmanager`;
    static label = "§3§lChatManager§r §f|"

    get middleware(): Middleware {
        return (context: PacketContext) => {
            const message = context.packet.message;

            if (message.startsWith(ChatManager.prefix)) {
                context.setCanceled(true);

                const messageArguments = message.replace(ChatManager.prefix, "")
                    .trim()
                    .split(" ");

                if (messageArguments.length === 2) {
                    const [builderId, action] = messageArguments as [ChatBuilder["id"], StringButton | ITrigger["name"]];

                    if (builderId && action) {
                        const builderInstance = buildersStorage.get(builderId);

                        if (builderInstance) {
                            builderInstance.executeAction(action);
                        } else {
                            if (this.fallbackHandler) {
                                this.fallbackHandler();
                            }
                        }
                    }
                }
            }
        };
    }

    onFallback(handler: FallbackHandler): this {
        this.fallbackHandler = handler;

        return this;
    }
}

export * from "./components";
export {
    ChatManager,
    buildersStorage,
    ChatBuilder
};
