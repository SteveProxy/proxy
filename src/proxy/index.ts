import minecraftPath from 'minecraft-path';
import { ClickAction, HoverAction, parser, text } from 'rawjsonbuilder';
import { createClient, states, Server, Client } from 'minecraft-protocol';

import { config, db, IConfig } from '../config';

import { Context, PacketManager, PluginManager } from './modules';

import { getCurrentTime, getVersion, IParsedIP, isValidIP, parseIP, serializeIP } from '../utils';

export interface IProxyOptions {
    server: Server;
    client: IClient;
}

export interface IClient extends Client {
    ended: boolean;
    context: Context;
}

export class Proxy {

    bridge!: IClient;
    client: IClient;
    server: Server;

    packetManager: PacketManager;
    pluginManager: PluginManager;

    currentServer = '';
    fallbackServer = serializeIP(this.config.lobby);
    #connectionStarted = false;

    constructor({ server, client }: IProxyOptions) {
        client.context = new Context({
            client,
            proxy: this,
            type: 'client'
        });

        this.client = client;
        this.server = server;

        this.packetManager = new PacketManager(this);
        this.pluginManager = new PluginManager(this);
    }

    get config(): IConfig {
        return db.data as IConfig;
    }

    start(): void {
        this.connect(this.fallbackServer);

        this.client.once('end', () => {
            if (this.bridge) {
                this.bridge.end('');
            }

            this.pluginManager.stop();
            this.packetManager.stop();
        });
    }

    async connect(ip: string): Promise<void> {
        if (this.#connectionStarted) {
            return this.client.context.send(
                `${config.bridge.title} | §cДождитесь окончания предыдущей попытки подключения!`
            );
        }

        if (!isValidIP(ip)) {
            return this.client.context.send(`${config.bridge.title} | §cНеверный IP-Адрес!`);
        }

        if (this.currentServer === ip) {
            return this.client.context.send(
                `${config.bridge.title} | §cВы уже подключены к этому серверу!`
            );
        }

        if (this.bridge) {
            this.client.context.send(`${config.bridge.title} | Подключение к серверу...`);
        }

        this.#connectionStarted = true;

        const bridge = await this.createBridge(
            parseIP(ip)
        );

        const isFallbackServer = ip === this.fallbackServer;

        bridge.once('login', (packet) => {
            this.#connectionStarted = false;
            this.currentServer = ip;

            if (this.bridge) {
                this.bridge.end('');
            }

            this.bridge = bridge;

            this.startRedirect();

            const playerDimension = packet.dimension;

            if (getVersion(this.config.proxy.version) <= getVersion('1.8.9')) {
                packet.dimension = packet.dimension >= 0 ? -1 : 0;
            }

            this.client.write('login', packet);
            this.client.write('respawn', {
                dimension: playerDimension,
                worldName: packet.worldName,
                hashedSeed: packet.hashedSeed,
                gamemode: packet.gameMode,
                previousGamemode: packet.previousGamemode,
                isDebug: packet.isDebug,
                isFlat: packet.isFlat,
                copyMetadata: true
            });

            this.pluginManager.restart();

            if (isFallbackServer) {
                this.pluginManager.execute('connect');
            }
        });
    }

    setFallbackServer(server: string | IParsedIP): void {
        this.fallbackServer = serializeIP(server);
    }

    connectToFallbackServer(): void {
        this.connect(this.fallbackServer);
    }

    get isLobby(): boolean {
        return this.currentServer === this.fallbackServer;
    }

    private async createBridge({ host, port }: IParsedIP): Promise<IClient> {
        const bridge = createClient({
            ...config.proxy,
            host,
            port,
            ...(await this.getSession())
        }) as IClient;

        bridge.context = new Context({
            client: bridge,
            proxy: this,
            type: 'bridge'
        });

        const bridgeDisconnectEvents = [
            'disconnect',
            'kick_disconnect',
            'error',
            'end'
        ];

        let disconnected = false;

        bridgeDisconnectEvents.forEach((event) => {
            bridge.once(event, (data) => {
                if (disconnected) {
                    return;
                }

                this.#connectionStarted = false;
                disconnected = true;

                const reason = data?.reason ?
                    parser.parseJSON(
                        JSON.parse(data.reason)
                    )
                    :
                    data instanceof Error ?
                        data.toString()
                        :
                        '';

                if (this.bridge) {
                    bridge.removeAllListeners('packet');

                    if (reason && reason !== 'SocketClosed') {
                        const disconnectTime = getCurrentTime();

                        const builder = text(`${config.bridge.title} | §cСоединение разорвано. ${reason}`)
                            .addNewLine()
                            .addNewLine();

                        if (this.currentServer !== this.fallbackServer) {
                            builder.addExtra(
                                text(`   §7[§f${disconnectTime}§7]   `)
                                    .setHoverEvent({
                                        action: HoverAction.SHOW_TEXT,
                                        value: text(`Вы были отключеный от сервера в §f${disconnectTime}§7.`, 'gray')
                                    })
                            );
                        }

                        builder.addExtra(
                            text('   §7[§fПереподключиться§7]   ')
                                .setHoverEvent({
                                    action: HoverAction.SHOW_TEXT,
                                    value: text('Нажмите, чтобы переподключиться к серверу.', 'gray')
                                })
                                .setClickEvent({
                                    action: ClickAction.RUN_COMMAND,
                                    value: `${PluginManager.prefix}connect ${host}:${port}`
                                })
                        );

                        this.client.context.send(builder);

                        console.error(reason);
                    }

                    if (this.bridge === bridge) {
                        if (this.currentServer !== this.fallbackServer) {
                            this.connect(this.fallbackServer);
                        }
                    }
                } else {
                    this.client.context.end(`Соединение разорвано.\n\n${reason}`);
                }
            });
        });

        return bridge;
    }

    private startRedirect(): void {
        this.client.removeAllListeners('packet');

        this.redirect(this.bridge, this.client);
        this.redirect(this.client, this.bridge);
    }

    private redirect(from: IClient, to: IClient) {
        const isFromServer = from === this.bridge;

        from.on('packet', (packet, meta) => {
            if (meta?.state === states.PLAY && from?.state === states.PLAY) {
                switch (meta.name) {
                    case 'compress':
                        from.compressionThreshold = packet.threshold;
                        to.compressionThreshold = packet.threshold;

                        break;
                    default:
                        this.packetManager.packetSwindler({
                            packet,
                            meta,
                            isFromServer,
                            send: (data: any) => to.write(meta.name, data)
                        });

                        break;
                }
            }
        });
    }

    private async getSession(): Promise<any> {
        try {
            const { accounts, activeAccountLocalId, mojangClientToken: clientToken } = (await import(`file://${minecraftPath()}/launcher_accounts.json`))
                .default;

            const { accessToken, minecraftProfile: selectedProfile } = accounts[activeAccountLocalId];

            return {
                session: {
                    accessToken,
                    selectedProfile,
                    clientToken
                },
                username: selectedProfile.name
            };
        } catch (error) {
            this.client.context.end('Произошла ошибка при чтении файла с сессией.');

            console.log(error);
        }
    }
}

export * from './modules';
export * from './plugins';