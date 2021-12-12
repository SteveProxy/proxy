import { ChatBuilder } from './builder';
import { PluginManager } from '../pluginManager';
import { PacketContext } from '../packetManager';

import { Button, ITrigger } from './types';

export const buildersStorage = new Map<string, ChatBuilder>();

export class ChatManager {

    fallbackHandler: (() => unknown) | undefined | null;
    static prefix = `${PluginManager.prefix}chatmanager`;
    static label = '§3§lChatManager§r §f|';

    get middleware(): (message: PacketContext) => unknown {
        return (context: PacketContext) => {
            const message = context.packet.message;

            if (message.startsWith(ChatManager.prefix)) {
                context.setCanceled(true);

                const messageArguments = message.replace(ChatManager.prefix, '')
                    .trim()
                    .split(' ');

                if (messageArguments.length === 2) {
                    const [builderId, action] = messageArguments as [ChatBuilder['id'], Button | ITrigger['name']];

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

    onFallback(handler: ChatManager['fallbackHandler']): this {
        this.fallbackHandler = handler;

        return this;
    }
}

export * from './builder';
