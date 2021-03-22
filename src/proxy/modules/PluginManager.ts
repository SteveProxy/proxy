import { Proxy } from "../Proxy";

import { PacketContext } from "./packetManager/PacketManager";
import { ChatManager } from "./chatManager/ChatManager";

import { plugins } from "../plugins";
import { config } from "../../config";

import { CommandsMap, PluginsMap, ValuesOf } from "../../interfaces";

const { bridge: { prefix } } = config;

export class PluginManager {

    readonly proxy: Proxy;
    static readonly prefix = prefix;

    private commands: CommandsMap = new Map();
    plugins: PluginsMap = new Map();
    private isStarted = false;

    private chatManager = new ChatManager()
        .onFallback(() => {
            this.proxy.client.context.send(`${ChatManager.label} §cВремя действия этой страницы истекло, вызовите команду заново.`);
        });

    constructor(proxy: Proxy) {
        this.proxy = proxy;
    }

    start(): void {
        if (!this.isStarted) {
            plugins.forEach((Plugin) => this.enablePlugin(Plugin));

            this.proxy.packetManager.on("chat", (context: PacketContext) => {
                if (!context.isFromServer) {
                    this.chatManager.middleware(context);

                    this.commands.forEach(({ handler, args, pluginName }, name) => {
                        const commandPrefix = `${prefix}${name}`;
                        const argsLength = (args as string[]).length;

                        if (argsLength) {
                            if (context.packet.message.startsWith(`${commandPrefix} `)) {
                                context.setCanceled(true);

                                const trimmedMessage = context.packet.message.replace(commandPrefix, "")
                                    .trim();
                                const handlerArgs = trimmedMessage !== "" ?
                                    argsLength > 1 ?
                                        trimmedMessage
                                            .split(" ")
                                            .slice(0, argsLength)
                                        :
                                        [trimmedMessage]
                                    :
                                    [];

                                if (handlerArgs.length >= argsLength) {
                                    return handler(handlerArgs);
                                }
                            }

                            if (context.packet.message === commandPrefix) {
                                context.setCanceled(true);

                                this.proxy.client.context.send(`${this.plugins.get(pluginName).meta.prefix} §cКоманде не переданы нужные аргументы!`);
                            }
                        } else {
                            if (context.packet.message === commandPrefix) {
                                context.setCanceled(true);

                                return handler();
                            }
                        }
                    });
                }
            });

            this.isStarted = true;
        }
    }

    private enablePlugin(Plugin: ValuesOf<typeof plugins>): void {
        const plugin = new Plugin(this.proxy);

        const { name: pluginName, commands, ignorePluginPrefix } = plugin.meta;

        if (commands) {
            commands.forEach(({ name: commandName, handler, args = [] }) => {
                const commandPrefix = (`${!ignorePluginPrefix ? pluginName : ""} ${commandName}`)
                    .trim();

                this.commands.set(commandPrefix, {
                    handler: (args) => {
                        handler.apply(plugin, args);
                    },
                    args,
                    pluginName
                });
            });
        }

        plugin.start();
        this.plugins.set(pluginName, plugin);
    }

    stop(): void {
        [...this.plugins.values()]
            .forEach((plugin) => plugin.stop());
    }
}
