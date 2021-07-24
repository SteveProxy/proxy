import minecraftPath from 'minecraft-path';
import { ClickAction, HoverAction, parse, text, translate } from 'rawjsonbuilder';
import { parse as parseNBT } from 'prismarine-nbt';
import { promises as fs } from 'fs';

import { Proxy } from '../../Proxy';
import { Plugin } from '../Plugin';
import { PluginManager, Head, PlayerHead } from '../../modules';

import { config } from '../../../config';

import { ICommand, IRawServer, IServer } from '../../../interfaces';

export class Core extends Plugin {

    private tab: Set<string> = new Set();
    private bossBar: Set<string> = new Set();

    private serversBuilder = this.proxy.client.context.pagesBuilder()
        .setInventoryType('generic_9x6');

    constructor(proxy: Proxy) {
        super(proxy, {
            name: 'core',
            description: 'Ядро',
            prefix: '§3§lCore',
            ignorePluginPrefix: true
        });

        this.meta.commands = [
            {
                name: 'help',
                description: 'Список доступных команд',
                handler: this.help
            },
            {
                name: 'connect',
                description: 'Подключиться к серверу',
                handler: this.connect,
                args: [
                    'IP-Адрес'
                ],
                argsRequired: false
            },
            {
                name: 'lobby',
                description: 'Подключиться к лобби',
                handler: this.proxy.connectToFallbackServer.bind(this.proxy)
            }
        ];
    }

    start(): void {
        this.sendBrandTab();

        this.listenTabChanges();
        this.listenBossBarChanges();
    }

    stop(): void {
        this.clearTab();
        this.clearBossBar();
    }

    listenBossBarChanges(): void {
        this.proxy.packetManager.on('boss_bar', ({ packet: { action, entityUUID } }) => {
            switch (action) {
                case 0:
                    return this.bossBar.add(entityUUID);
                case 1:
                    return this.bossBar.delete(entityUUID);
            }
        });
    }

    clearBossBar(): void {
        this.bossBar.forEach((entityUUID) => {
            this.proxy.client.write('boss_bar', {
                action: 1,
                entityUUID
            });
        });

        this.bossBar.clear();
    }

    listenTabChanges(): void {
        this.proxy.packetManager.on('player_info', ({ packet: { action, data } }) => {
            data.forEach(({ UUID }: { UUID: string }) => {
                switch (action) {
                    case 0:
                        return this.tab.add(UUID);
                    case 4:
                        return this.tab.delete(UUID);
                }
            });
        });
    }

    clearTab(): void {
        this.proxy.client.write('player_info', {
            action: 4,
            data: [...this.tab].map((UUID) => ({
                UUID
            }))
        });

        this.tab.clear();
    }

    private sendBrandTab(): void {
        this.proxy.client.context.sendTab({
            header: parse(config.bridge.title)
        });
    }

    private help(): void {
        const plugins = [...this.proxy.pluginManager.plugins.values()]
            .filter(({ meta: { hidden, commands } }) => !hidden && commands.length);

        const builder = this.proxy.client.context.chatBuilder()
            .setPagesHeader(`${config.bridge.title} | Список доступных команд`);

        builder.addPages(
            text('')
                .addExtra(
                    plugins.map(({ meta: { name, description, prefix } }, index) => {
                        builder.addTriggers({
                            name,
                            callback: () => builder.setPage(index + 2)
                        });

                        return text(`${prefix} ${description}${index + 1 < plugins.length ? '\n' : ''}`)
                            .setHoverEvent({
                                action: HoverAction.SHOW_TEXT,
                                contents: text('Нажмите, чтобы посмотреть доступные команды плагина.', 'gray')
                            })
                            .setClickEvent({
                                action: ClickAction.RUN_COMMAND,
                                value: `${builder.triggerCommandPrefix} ${name}`
                            });
                    })
                )
        );

        plugins.forEach(({ meta: { name: pluginName, description, prefix, commands, ignorePluginPrefix } }) => {
            const page = text(`${prefix} ${description}`)
                .addNewLine()
                .addNewLine();

            commands.forEach(({ name: commandName, ignorePluginPrefix: commandIgnorePluginPrefix, hidden, args = [], description }: ICommand, index: number) => {
                if (hidden) {
                    return;
                }

                const command = (`${PluginManager.prefix}${!(ignorePluginPrefix || commandIgnorePluginPrefix) ? `${pluginName} ${commandName}` : commandName}`)
                    .trim();

                args = args.map((arg) => `§7<§r${arg}§7>§r`);

                page.addExtra(
                    text(`${command}${args.length ? ` ${args.join(' ')}` : ''} §7-§r ${description}${index + 1 < commands.length ? '\n' : ''}`)
                        .setHoverEvent({
                            action: HoverAction.SHOW_TEXT,
                            contents: text(`Нажмите, чтобы ${args.length ? 'вставить команду в чат' : 'вызвать команду'}.`, 'gray')
                        })
                        .setClickEvent({
                            action: args.length ? ClickAction.SUGGEST_COMMAND : ClickAction.RUN_COMMAND,
                            value: command
                        })
                );
            });

            builder.addPages(page);
        });

        builder.build();
    }

    async connect(ip = ''): Promise<void> {
        if (ip) {
            return this.proxy.connect(ip);
        }

        const serversDatBuffer = await fs.readFile(`${minecraftPath()}/servers.dat`);

        // @ts-ignore
        let { value: { servers: { value: { value: servers } } } } = (await parseNBT(serversDatBuffer))
            .parsed;

        servers = servers.map((server: IRawServer) => {
            Object.keys(server)
                .forEach((key) => {
                    server[key as keyof IRawServer] = server[key as keyof IRawServer].value;
                });

            (server as unknown as IServer).ip = Proxy.parseIP(server.ip as unknown as string);

            return server;
        })
            .filter(({ ip }: IServer) => ip && ip !== Proxy.parseIP(`${config.proxy.host}:${config.proxy.port}`));

        if (!servers.length) {
            return this.proxy.client.context.send(
                translate(`${this.meta.prefix} §cНет доступных серверов для подключения! Добавьте нужные сервера во вкладке "%s§c".`, [
                    translate('menu.multiplayer')
                ])
            );
        }

        return this.serversBuilder
            .autoGeneratePages({
                windowTitle: text(`${this.meta.prefix} Выбор сервера`),
                // eslint-disable-next-line new-cap
                items: servers.map(({ ip, name }: IServer) => PlayerHead({
                    name: text(name || 'Без названия', 'white')
                        .setItalic(false),
                    lore: [
                        text(''),
                        text(
                            this.proxy.currentServer === ip ?
                                '§3Выбран'
                                :
                                '§7Нажмите, для того чтобы выбрать сервер.'
                        )
                    ],
                    value: Head.Server,
                    onClick: () => {
                        this.proxy.connect(ip);
                        this.connect();
                    }
                }))
            })
            .build();
    }
}
