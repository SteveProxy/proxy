import { Proxy } from "../Proxy";

import { PacketContext } from "./packetManager/PacketManager";

import { plugins } from "../plugins";
import { config } from "../../config";

import { CommandsMap, ValuesOf } from "../../interfaces";

const { bridge: { prefix } } = config;

export class PluginManager {

    proxy: Proxy;

    private commands: CommandsMap = new Map();
    private loadedPlugins: any[] = [];
    private isStarted = false;

    constructor(proxy: Proxy) {
        this.proxy = proxy;
    }

    start(): void {
        if (!this.isStarted) {
            plugins.forEach((Plugin) => this.enablePlugin(Plugin));

            this.proxy.packetManager.on("chat", (context: PacketContext) => {
                if (!context.isFromServer) {
                    this.commands.forEach(({ handler, hasArguments }, name) => {
                        const commandPrefix = `${prefix}${name}`;

                        if (
                            hasArguments ?
                                context.packet.message.startsWith(commandPrefix)
                                :
                                context.packet.message === commandPrefix
                        ) {
                            context.setCanceled(true);

                            handler(
                                context.packet.message.replace(commandPrefix, "")
                                    .trim()
                                    .split(" ")
                            );
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
            commands.forEach(({ name: commandName, handler, hasArguments = false }) => {
                this.commands.set((`${pluginName} ${commandName}`).trim(), {
                    handler: (args) => {
                        handler.apply(plugin, args);
                    },
                    hasArguments
                });
            });
        }

        plugin.start();
        this.loadedPlugins.push(plugin);
    }

    stop(): void {
        this.loadedPlugins.forEach((plugin) => plugin.stop());
    }
}
