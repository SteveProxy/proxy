import minecraftPath from "minecraft-path";
import { RawJSONBuilder } from "rawjsonbuilder";
import { parse } from "prismarine-nbt";
import { promises as fs } from "fs";

import { Proxy } from "../../Proxy";
import { Plugin } from "../Plugin";
import { PluginManager } from "../../modules/PluginManager";

import { PlayerHead, Head } from "../../modules/pagesBuilder/gui";

import { db } from "../../../DB";
import { config } from "../../../config";
import { minecraftData, parseIP } from "../../../utils";

import { ICommand, IRawServer, IServer, Page as ChatPage } from "../../../interfaces";

export class Core extends Plugin {

    private serversBuilder = this.proxy.client.context.pagesBuilder()
        .setInventoryType("generic_9x6");
    private currentServer = Core.parseIP(
        this.proxy.config.lobby
    );
    private changeCurrentServerCooldown = 0;

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "core",
            description: "Ядро",
            prefix: "§3§lCore",
            ignorePluginPrefix: true
        });

        this.meta.commands = [
            {
                name: "connect",
                description: "Подключится к другому серверу",
                handler: this.connect
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
                .parse(config.bridge.title)
        });
    }

    help(): void {
        let plugins = [...this.proxy.pluginManager.plugins.values()];

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

    async connect(): Promise<void> {
        const serversDatBuffer = await fs.readFile(`${minecraftPath()}/servers.dat`);

        // @ts-ignore
        let { value: { servers: { value: { value: servers } } } } = (await parse(serversDatBuffer))
            .parsed;

        servers = servers.map((server: IRawServer) => {
            Object.keys(server)
                .forEach((key) => {
                    server[key as keyof IRawServer] = server[key as keyof IRawServer].value;
                });

            (server as unknown as IServer).ip = Core.parseIP(server.ip as unknown as string);

            return server;
        })
            .filter(({ ip }: IServer) => ip && ip !== Core.parseIP(`${config.proxy.host}:${config.proxy.port}`));

        return this.serversBuilder
            .autoGeneratePages({
                windowTitle: new RawJSONBuilder()
                    .setText(`${this.meta.prefix} Выбор сервера`),
                // eslint-disable-next-line new-cap
                items: servers.map(({ ip, name }: IServer) => PlayerHead({
                    name: new RawJSONBuilder()
                        .setText({
                            text: name || "Без названия",
                            color: "white",
                            italic: false
                        }),
                    lore: [
                        new RawJSONBuilder()
                            .setText(""),
                        new RawJSONBuilder()
                            .setText(
                                this.currentServer === ip ?
                                    "§3Выбран"
                                    :
                                    "§7Нажмите, для того чтобы выбрать сервер."
                            )
                    ],
                    value: Head.Server,
                    onClick: () => {
                        this.changeServer(ip);
                        this.connect();
                    }
                }))
            })
            .build();
    }

    private changeServer(ip: string) {
        const COOLDOWN = 3;

        if (this.changeCurrentServerCooldown < Date.now()) {
            db.set("lobby", parseIP(ip))
                .write();

            if (this.currentServer === ip) {
                return this.proxy.client.context.send(`${this.meta.prefix} §cУ вас уже установлен данный сервер!`);
            }

            this.currentServer = ip;

            this.proxy.client.context.send(`${this.meta.prefix} Сервер изменен. Перезайдите для подключения к нему.`);

            this.changeCurrentServerCooldown = Date.now() + COOLDOWN * 1000;

            this.proxy.client.context.setCooldown({
                id: minecraftData.findItemOrBlockByName("player_head").id,
                cooldown: COOLDOWN
            });
        }
    }

    private static parseIP(ip: string | any): string {
        return Object.values(
            typeof ip === "string" ?
                parseIP(ip)
                :
                ip
        )
            .join(":");
    }
}
