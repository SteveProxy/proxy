import moment from 'moment';
import { text } from 'rawjsonbuilder';

import { ICommand, IPluginMeta, Proxy } from '../../';

import { PacketContext } from '../packetManager';
import { ChatManager } from '../chatManager';
import { QuestionBuilder } from '../questionBuilder';

import { plugins, Plugin } from '../../plugins';
import { config } from '../../../config';

import { ValuesOf } from '../../../utils';

const { bridge: { prefix } } = config;

export class PluginManager {

    readonly proxy: Proxy;
    static readonly prefix = prefix;

    commands = new Map<string, Omit<ICommand, 'name' | 'description' | 'handler'> & {
        pluginName: string;
        handler(args?: string[]): void;
    }>();
    plugins = new Map<string, Plugin>();
    #cooldowns = new Map<string, number>();

    #isStarted = false;

    #chatManager = (
        new ChatManager()
            .onFallback(() => {
                this.proxy.client.context.send(
                    `${ChatManager.label} §cВремя действия этой страницы истекло, вызовите команду заново.`
                );
            })
    );

    constructor(proxy: Proxy) {
        this.proxy = proxy;
    }

    start(): void {
        if (!this.#isStarted) {
            this.#isStarted = true;

            plugins.forEach((Plugin) => this.enablePlugin(Plugin));

            this.listenChat();
        }
    }

    stop(): void {
        if (this.#isStarted) {
            [...this.plugins.values()]
                .forEach((plugin) => plugin.stop());

            this.plugins = new Map();
            this.commands = new Map();

            this.#isStarted = false;

            this.proxy.packetManager.stop();
            QuestionBuilder.stop();
        }
    }

    restart(): void {
        this.stop();
        this.start();
    }

    execute(commandName: ICommand['name']): void {
        const command = this.commands.get(commandName);

        if (command) {
            command.handler();
        }
    }

    private listenChat(): void {
        this.proxy.packetManager.on('chat', (context: PacketContext) => {
            if (!context.isFromServer) {
                this.#chatManager.middleware(context);
                QuestionBuilder.middleware(context);

                this.commands.forEach(({ pluginName, handler, args = [], argsRequired, sliceArgs }, name) => {
                    const commandPrefix = `${prefix}${name}`;
                    const argsLength = args.length;

                    if (argsLength) {
                        if (context.packet.message.startsWith(`${commandPrefix}${!argsRequired ? '' : ' '}`)) {
                            context.setCanceled();

                            const trimmedMessage = context.packet.message.replace(commandPrefix, '')
                                .trim();

                            let handlerArgs = [];

                            if (trimmedMessage !== '') {
                                if (argsLength > 1) {
                                    const args = trimmedMessage
                                        .split(' ');

                                    if (sliceArgs) {
                                        handlerArgs = args.slice(0, argsLength);
                                    } else {
                                        handlerArgs = [
                                            args[0],
                                            args.slice(1)
                                                .reduce((acc: string, arg: string) => `${acc} ${arg}`, '')
                                                .trim()
                                        ];
                                    }
                                } else {
                                    handlerArgs = [trimmedMessage];
                                }
                            }

                            if (handlerArgs.length >= argsLength || !argsRequired) {
                                return handler(handlerArgs);
                            }
                        }

                        if (context.packet.message === commandPrefix) {
                            context.setCanceled();

                            this.proxy.client.context.send(`${this.plugins.get(pluginName)!.meta.prefix} §cКоманде не переданы нужные аргументы!`);
                        }
                    } else {
                        if (context.packet.message === commandPrefix) {
                            context.setCanceled();

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
            commands.forEach(({ name: commandName, ignorePluginPrefix: commandIgnorePluginPrefix, handler, args = [], cooldown, argsRequired = true, sliceArgs = true }) => {
                const commandPrefix = (`${!(ignorePluginPrefix || commandIgnorePluginPrefix) ? pluginName : ''} ${commandName}`)
                    .trim();

                if (cooldown) {
                    plugin.meta.cooldown = this.cooldown(commandPrefix, cooldown);
                }

                this.commands.set(commandPrefix, {
                    pluginName,
                    handler: (args) => {
                        const cooldown = this.#cooldowns.get(commandPrefix);

                        if (Number(cooldown) > Date.now()) {
                            return this.proxy.client.context.send(
                                text(`${prefix} §cВоспользоваться этой командой снова можно будет`)
                                    .addSpace()
                                    .addExtra(
                                        text(moment(cooldown).fromNow(), 'red')
                                            .setBold()
                                    )
                            );
                        }

                        handler.apply(plugin, args!);
                    },
                    args,
                    argsRequired,
                    sliceArgs
                });
            });
        }

        plugin.start();

        this.plugins.set(pluginName, plugin as Plugin);
    }

    private cooldown(command: IPluginMeta['name'], cooldown: number): VoidFunction {
        return () => {
            this.#cooldowns.set(command, Date.now() + cooldown * 1_000);
        };
    }
}
