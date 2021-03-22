import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../../Proxy";
import { Plugin } from "../Plugin";
import { PluginManager } from "../../modules/PluginManager";
import { Item, NBT, Page } from "../../modules/pagesBuilder/PagesBuilder";

import { config } from "../../../config";

import { ICommand, Page as ChatPage } from "../../../interfaces";

export class Core extends Plugin {

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "core",
            description: "Ядро",
            prefix: "§3§lCore§r §f|",
            ignorePluginPrefix: true
        });

        this.meta.commands = [
            {
                name: "test",
                description: "Тестовая команда",
                handler: this.test
            },
            {
                name: "help",
                description: "Список доступных команд",
                handler: this.help
            }
        ];
    }

    start(): void {
        this.proxy.client.context.sendTab({
            header: new RawJSONBuilder()
                .parse(`${config.bridge.title}\n§r`)
        });

        this.proxy.client.context.send(
            new RawJSONBuilder()
                .setText({
                    text: "тест",
                    clickEvent: {
                        action: "run_command",
                        value: "/help"
                    }
                })
        );

        this.proxy.client.context.chatBuilder()
            .setPagesHeader("Шапка")
            .setPagesFooter("Футер")
            .setPages([
                new RawJSONBuilder()
                    .setText("Страница"),
                new RawJSONBuilder()
                    .setText("Страница")
            ])
            .build();
    }

    help(plugins: any[]): void {
        plugins = plugins.filter(({ meta: { hidden, commands } }) => !hidden && commands.length);

        const builder = this.proxy.client.context.chatBuilder();

        builder.setPagesHeader(`${config.bridge.title} | Список доступных команд`)
            .setPages([
                new RawJSONBuilder()
                    .setExtra(
                        plugins.map(({ meta: { name, description, prefix } }, index) => {
                            builder.addTriggers({
                                name,
                                callback: () => builder.setPage(index + 2)
                            });

                            return new RawJSONBuilder()
                                .setText({
                                    text: `${prefix} ${description}${index + 1 < plugins.length ? "\n" : ""}`,
                                    hoverEvent: {
                                        action: "show_text",
                                        contents: new RawJSONBuilder()
                                            .setText("§7Нажмите, чтобы посмотреть доступные команды плагина.")
                                    },
                                    clickEvent: {
                                        action: "run_command",
                                        value: `${builder.triggerCommandPrefix} ${name}`
                                    }
                                });
                        })
                    ),
                // eslint-disable-next-line array-callback-return
                ...plugins.map(({ meta: { name: pluginName, description, prefix, commands, ignorePluginPrefix } }) => new RawJSONBuilder()
                    .setExtra([
                        new RawJSONBuilder()
                            .setText(`${prefix} ${description}\n\n`),
                        // eslint-disable-next-line array-callback-return
                        ...commands.map(({ name: commandName, hidden, args = [], description }: ICommand, index: number) => {
                            if (!hidden) {
                                const command = (`${PluginManager.prefix}${!ignorePluginPrefix ? `${pluginName} ${commandName}` : commandName}`)
                                    .trim();

                                args = args.map((arg) => `§7<§r${arg}§7>§r`);

                                return new RawJSONBuilder()
                                    .setExtra([
                                        new RawJSONBuilder()
                                            .setText({
                                                text: `${command}${args.length ? ` ${args}` : ""} §7-§r ${description}${index + 1 < commands.length ? "\n" : ""}`,
                                                hoverEvent: {
                                                    action: "show_text",
                                                    contents: new RawJSONBuilder()
                                                        .setText(`§7Нажмите, чтобы ${args.length ? "вставить команду в чат" : "вызвать команду"}.`)
                                                },
                                                clickEvent: {
                                                    action: args.length ? "suggest_command" : "run_command",
                                                    value: command
                                                }
                                            })
                                    ]);
                            }
                        })
                    ]))
                    .filter(Boolean) as ChatPage[]
            ])
            .build();
    }

    test(): void {
        const builder = this.proxy.client.context.pagesBuilder();

        builder.setPages([
            new Page()
                .setWindowTitle(new RawJSONBuilder()
                    .setText("test"))
                .setItems(new Item({
                    id: 1,
                    position: 0,
                    nbt: new NBT("compound", {
                        display: new NBT("compound", {
                            Name: new NBT("string", new RawJSONBuilder()
                                .setText({
                                    text: "test",
                                    color: "yellow",
                                    strikethrough: true
                                })
                                .toString())
                        })
                    }),
                    onClick: () => {
                        this.proxy.client.context.send("TEST");
                        builder.setPage(2);
                    }
                })),
            new Page()
                .setWindowTitle(new RawJSONBuilder()
                    .setText("test"))
                .setItems(new Item({
                    id: 12,
                    position: 2,
                    nbt: new NBT("compound", {
                        display: new NBT("compound", {
                            Name: new NBT("string", new RawJSONBuilder()
                                .setText({
                                    text: "test",
                                    color: "yellow",
                                    strikethrough: true
                                })
                                .toString())
                        })
                    }),
                    onClick: () => {
                        this.proxy.client.context.send("TEST");
                        builder.setPage(1);
                    }
                }))
        ])
            .setDefaultButtons({ next: { position: 1 } })
            .build();
    }
}
