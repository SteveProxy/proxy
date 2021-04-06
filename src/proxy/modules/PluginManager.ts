import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../Proxy";

import { PacketContext } from "./packetManager/PacketManager";
import { ChatManager } from "./chatManager/ChatManager";

import { plugins } from "../plugins";
import { config } from "../../config";
import { getUntilTime, humanize } from "../../utils";

import { CommandsMap, CooldownsMap, PluginsMap, ValuesOf, ICooldownOptions } from "../../interfaces";

const { bridge: { prefix } } = config;

export class PluginManager {

    readonly proxy: Proxy;
    static readonly prefix = prefix;

    commands: CommandsMap = new Map();
    plugins: PluginsMap = new Map();
    private cooldowns: CooldownsMap = new Map();
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
            this.isStarted = true;

            plugins.forEach((Plugin) => this.enablePlugin(Plugin));

            this.listenChat();
        }
    }

    stop(): void {
        if (this.isStarted) {
            [...this.plugins.values()]
                .forEach((plugin) => plugin.stop());

            this.plugins = new Map();
            this.commands = new Map();

            this.isStarted = false;

            this.proxy.packetManager.clear();
        }
    }

    restart(): void {
        this.stop();
        this.start();
    }

    private listenChat(): void {
        this.proxy.packetManager.on("chat", (context: PacketContext) => {
            if (!context.isFromServer) {
                this.chatManager.middleware(context);

                this.commands.forEach(({ pluginName, handler, args = [], argsRequired }, name) => {
                    const commandPrefix = `${prefix}${name}`;
                    const argsLength = args.length;

                    if (argsLength) {
                        if (context.packet.message.startsWith(`${commandPrefix}${!argsRequired ? "" : " "}`)) {
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

                            if (handlerArgs.length >= argsLength || !argsRequired) {
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
    }

    private enablePlugin(Plugin: ValuesOf<typeof plugins>): void {
        const plugin = new Plugin(this.proxy);

        const { name: pluginName, commands, ignorePluginPrefix, prefix } = plugin.meta;

        if (commands) {
            commands.forEach(({ name: commandName, ignorePluginPrefix: commandIgnorePluginPrefix, handler, args = [], cooldown, argsRequired = true }) => {
                const commandPrefix = (`${!(ignorePluginPrefix || commandIgnorePluginPrefix) ? pluginName : ""} ${commandName}`)
                    .trim();

                if (cooldown) {
                    plugin.meta.cooldown = this.cooldown({
                        command: commandPrefix,
                        cooldown
                    });
                }

                this.commands.set(commandPrefix, {
                    pluginName,
                    handler: (args) => {
                        const cooldown = this.cooldowns.get(commandPrefix);

                        if (cooldown && cooldown > Date.now()) {
                            const cooldownUntil = getUntilTime(cooldown);

                            return this.proxy.client.context.send(
                                new RawJSONBuilder()
                                    .setText(`${prefix} §cВоспользоваться этой командой снова можно будет через `)
                                    .setExtra(
                                        new RawJSONBuilder()
                                            .setText({
                                                text: humanize(cooldownUntil),
                                                color: "red",
                                                bold: true
                                            })
                                    )
                            );
                        }

                        handler.apply(plugin, args);
                    },
                    args,
                    argsRequired
                });
            });
        }

        plugin.start();
        this.plugins.set(pluginName, plugin);
    }

    private cooldown({ command, cooldown }: ICooldownOptions): VoidFunction {
        return () => {
            this.cooldowns.set(command, Date.now() + cooldown * 1000);
        };
    }
}
