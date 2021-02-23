import { Proxy } from "../Proxy";

import { PacketContext } from "./packetManager/PacketManager";

import { plugins } from "../plugins";
import { config } from "../../config";

import { ValuesOf } from "../../interfaces";

const { bridge: { prefix } } = config;

export class PluginManager {

    proxy: Proxy;

    private commands: Map<string, (args: []) => void> = new Map();
    private loadedPlugins: any[] = [];
    private isStarted = false;
    private listener: (context: PacketContext) => void;

    constructor(proxy: Proxy) {
        this.proxy = proxy;

        this.listener = (context: PacketContext) => {
            if (!context.isFromServer) {
                this.commands.forEach((execute, name) => {
                    const commandPrefix = `${prefix}${name}`;

                    if (context.packet.message.startsWith(commandPrefix)) {
                        context.setCanceled(true);

                        execute(
                            context.packet.message.replace(commandPrefix, "")
                                .trim()
                                .split(" ")
                        );
                    }
                });
            }
        };
    }

    start(): void {
        if (!this.isStarted) {
            plugins.forEach((Plugin) => this.enablePlugin(Plugin));

            this.proxy.packetManager.on("chat", this.listener);

            this.isStarted = true;
        }
    }

    enablePlugin(Plugin: ValuesOf<typeof plugins>): void {
        const plugin = new Plugin(this.proxy);

        const pluginName = plugin.meta.name;
        const commands = plugin.meta.commands;

        if (commands) {
            commands.forEach(({ name: commandName, handler }) => {
                this.commands.set(`${pluginName} ${commandName}`, (args) => {
                    handler.apply(plugin, args);
                });
            });
        }

        plugin.start();
        this.loadedPlugins.push(plugin);

        console.log(`[Steve] PluginManager: ${plugin.meta.name} started!`);
    }

    stop(): void {
        this.proxy.client.removeListener("chat", this.listener);

        this.loadedPlugins.forEach((plugin) => {
            if (plugin.stop) {
                plugin.stop();
            }

            console.log(`[Steve] PluginManager: ${plugin.meta.name} stopped!`);
        });
    }
}
