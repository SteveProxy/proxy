import { JSONFile, Low } from 'lowdb';
import { stripIndents } from 'common-tags';
import { ClickAction, HoverAction, parser, text } from 'rawjsonbuilder';
import { Client, createClient, Server, states } from 'minecraft-protocol';

import { config } from '../config';

import { Auth, ClientType, Context, IMinecraftAuthResponse, PacketManager, PluginManager } from './modules';

import {
    IParsedIP,
    getCurrentTime,
    getVersion,
    isValidIP,
    parseIP,
    serializeIP,
    SOCKET_CLOSED_EVENT,
    LOBBY_LOGIN_PACKET,
    USERS_DATA_PATH
} from '../utils';

export interface IProxyOptions {
    server: Server;
    client: IClient;
}

export interface IClient extends Client {
    ended: boolean;
    context: Context;
    id: number;
}

export interface IUser {
    plugins: Record<string, any>;
    microsoftSession: string;
    minecraftSession: Pick<IMinecraftAuthResponse, 'access_token' | 'expires_in'>;
}

const { proxy, lobby, bridge: { title } } = config.data!;

export class Proxy {

    bridge!: IClient;
    readonly client: IClient;
    readonly server: Server;
    readonly user: Low<IUser>;
    #auth!: Auth;

    packetManager: PacketManager;
    pluginManager: PluginManager;

    currentServer = '';
    fallbackServer = serializeIP(lobby);
    #connectionStarted = false;

    constructor({ server, client }: IProxyOptions) {
        client.context = new Context({
            client,
            proxy: this,
            type: ClientType.CLIENT
        });

        this.client = client;
        this.server = server;
        this.user = new Low(
            new JSONFile<IUser>(`${USERS_DATA_PATH}/${client.uuid}`)
        );

        this.packetManager = new PacketManager(this);
        this.pluginManager = new PluginManager(this);
    }

    async start(): Promise<void> {
        await this.#loadConfig()
            .catch((error) => {
                console.log(error);

                this.client.context.end('Произошла ошибка при загрузке данных профиля.');
            });

        this.#auth = new Auth(this);

        this.#cleanEnvironment();

        this.#auth.getSession()
            .then(() => {
                this.connectToFallbackServer();
            });

        this.client.once('end', () => {
            if (this.bridge) {
                this.bridge.end();
            }

            this.pluginManager.stop();
            this.packetManager.stop();
        });
    }

    get userConfig(): IUser {
        return this.user.data!;
    }

    get isLobby(): boolean {
        return this.currentServer === this.fallbackServer;
    }

    async connect(ip: string): Promise<void> {
        if (this.#connectionStarted) {
            return this.client.context.send(
                `${title} | §cДождитесь окончания предыдущей попытки подключения!`
            );
        }

        if (!isValidIP(ip)) {
            return this.client.context.send(`${title} | §cНеверный IP-Адрес!`);
        }

        if (this.currentServer === ip) {
            return this.client.context.send(
                `${title} | §cВы уже подключены к этому серверу!`
            );
        }

        this.client.context.send(`${title} | Подключение к серверу...`);

        this.#connectionStarted = true;

        const bridge = await this.#createBridge(
            parseIP(ip)
        );

        if (!bridge) {
            return;
        }

        bridge.once('login', (packet) => {
            const { dimension, worldName, hashedSeed, previousGamemode, isDebug, isFlat, gameMode: gamemode } = packet;

            this.#connectionStarted = false;
            this.currentServer = ip;

            if (this.bridge) {
                this.bridge.end('');
            }

            this.bridge = bridge;

            this.#startRedirect();

            this.client.write('login', packet);
            this.client.write('respawn', {
                dimension,
                worldName,
                hashedSeed,
                gamemode,
                previousGamemode,
                isDebug,
                isFlat,
                copyMetadata: true
            });

            if (!this.pluginManager.isStarted) {
                this.pluginManager.start();
            } else {
                this.pluginManager.clear();
            }

            if (this.isFallbackServer) {
                this.pluginManager.execute('connect');
            }
        });
    }

    connectToFallbackServer(): void {
        this.connect(this.fallbackServer);
    }

    setFallbackServer(server: string | IParsedIP): void {
        this.fallbackServer = serializeIP(server);
    }

    get isFallbackServer(): boolean {
        return this.currentServer === this.fallbackServer;
    }

    #cleanEnvironment() {
        this.client.write('login', LOBBY_LOGIN_PACKET);
        this.client.context.changePosition({
            x: 0,
            y: 64,
            z: 0
        });

        const channel = this.client.protocolVersion >= getVersion('1.13-pre3') ?
            'brand'
            :
            'MC|Brand';

        this.client.registerChannel(channel, ['string', []]);
        this.client.writeChannel(channel, title);
    }

    async #loadConfig() {
        await this.user.read();

        if (!this.user.data) {
            this.user.data = {} as IUser;

            await this.user.write();
        }
    }

    async #createBridge({ host, port }: IParsedIP): Promise<IClient | void> {
        const session = await this.#auth.getSession(true);

        if (!session) {
            return;
        }

        const bridge = createClient({
            ...proxy,
            ...session,
            host,
            port,
            skipValidation: true
        }) as IClient;

        bridge.context = new Context({
            client: bridge,
            proxy: this,
            type: ClientType.BRIDGE
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

                    if ((reason || data !== SOCKET_CLOSED_EVENT) && reason !== SOCKET_CLOSED_EVENT) {
                        const disconnectTime = getCurrentTime();

                        const builder = text(`${title} | §cСоединение разорвано. ${reason}`)
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
                    this.client.context.end(stripIndents`
                    Соединение разорвано.
                    
                    ${reason}
                    `);
                }
            });
        });

        return bridge;
    }

    #startRedirect(): void {
        this.client.removeAllListeners('packet');

        this.#redirect(this.bridge, this.client);
        this.#redirect(this.client, this.bridge);
    }

    #redirect(from: IClient, to: IClient) {
        const isFromServer = from === this.bridge;

        from.on('packet', (packet, meta) => {
            if (meta?.state === states.PLAY && from?.state === states.PLAY) {
                switch (meta.name) {
                    case 'compress': {
                        const { threshold } = packet;

                        from.compressionThreshold = threshold;
                        to.compressionThreshold = threshold;
                        break;
                    }
                    default:
                        this.packetManager.packetSwindler({
                            packet,
                            meta,
                            isFromServer,
                            send: (data) => (
                                to.write(meta.name, data)
                            )
                        });
                        break;
                }
            }
        });
    }
}

export * from './modules';
export * from './plugins';
