import { Proxy } from "../Proxy";

import { PacketContext } from "./packetManager/PacketManager";
import { ChatManager } from "./chatManager/ChatManager";

import { plugins } from "../plugins";
import { config } from "../../config";

import { CommandsMap, PluginsMap, ValuesOf } from "../../interfaces";

const { bridge: { prefix } } = config;

export class PluginManager {

    proxy: Proxy;

    private commands: CommandsMap = new Map();
    private plugins: PluginsMap = new Map();
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

                        if (
                            argsLength ?
                                context.packet.message.startsWith(commandPrefix)
                                :
                                context.packet.message === commandPrefix
                        ) {
                            context.setCanceled(true);

                            const trimmedMessage = context.packet.message.replace(commandPrefix, "")
                                .trim();
                            const handlerArgs = trimmedMessage !== "" ?
                                trimmedMessage
                                    .split(" ")
                                    .slice(0, argsLength)
                                :
                                [];

                            if (handlerArgs.length >= argsLength) {
                                handler(
                                    context.packet.message.replace(commandPrefix, "")
                                        .trim()
                                        .split(" ")
                                        .slice(0, argsLength),
                                    name === "help" ?
                                        this.plugins
                                        :
                                        undefined
                                );
                            } else {
                                this.proxy.client.context.send(`${this.plugins.get(pluginName).meta.prefix} §cКоманде не передан нужный аргумент!`);
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

        const pluginName = plugin.meta.name;
        const commands = plugin.meta.commands;

        if (commands) {
            commands.forEach(({ name: commandName, handler, args = [] }) => {
                this.commands.set((`${pluginName} ${commandName}`).trim(), {
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
