import minecraftPath from "minecraft-path";
import { RawJSONBuilder } from "rawjsonbuilder";
import { createClient, Server, states } from "minecraft-protocol";

import { db } from "../DB";
import { config } from "../config";

import { Context, PacketManager, PluginManager, separator } from "./modules";

import { getCurrentTime, getVersion, isValidIP, parseIP } from "../utils";

import { IClient, IConfig, IParsedIP, IProxyOptions } from "../interfaces";

export class Proxy {

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bridge: IClient;
    client: IClient;
    private server: Server;

    private connectionStarted = false;
    currentServer = "";
    fallbackServer = Proxy.parseIP(
        this.config.lobby
    );

    packetManager: PacketManager;
    pluginManager: PluginManager;

    constructor({ server, client }: IProxyOptions) {
        client.context = new Context({
            client,
            proxy: this,
            type: "client"
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

        this.client.once("end", () => {
            if (this.bridge) {
                this.bridge.end("");
            }

            this.pluginManager.stop();
            this.packetManager.clear();
        });
    }

    async connect(ip: string): Promise<void> {
        if (this.connectionStarted) {
            return this.client.context.send(
                `${config.bridge.title} | §cДождидесь окончания предыдущей попытки подключения!`
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

        this.connectionStarted = true;

        const bridge = await this.createBridge(
            parseIP(ip)
        );

        const isFallbackServer = ip === this.fallbackServer;

        bridge.once("login", (packet) => {
            this.connectionStarted = false;
            this.currentServer = ip;

            if (this.bridge) {
                this.bridge.end("");
            }

            this.bridge = bridge;

            this.startRedirect();

            const playerDimension = packet.dimension;

            if (getVersion(this.config.proxy.version) <= getVersion("1.8.9")) {
                packet.dimension = packet.dimension >= 0 ? -1 : 0;
            }

            this.client.write("login", packet);
            this.client.write("respawn", {
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
                const connectCommand = this.pluginManager.commands.get("connect");

                if (connectCommand) {
                    connectCommand.handler();
                }
            }
        });
    }

    setFallbackServer(server: string | IParsedIP): void {
        this.fallbackServer = Proxy.parseIP(server);
    }

    connectToFallbackServer(): void {
        this.connect(this.fallbackServer);
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
            type: "bridge"
        });

        const bridgeDisconnectEvents = [
            "disconnect",
            "kick_disconnect",
            "error",
            "end"
        ];

        let disconnected = false;

        bridgeDisconnectEvents.forEach((event) => {
            bridge.once(event, (data) => {
                if (disconnected) {
                    return;
                }

                this.connectionStarted = false;
                disconnected = true;

                const reason = data?.reason ?
                    new RawJSONBuilder(data?.reason)
                        .toRawString()
                    :
                    data instanceof Error ?
                        data.toString()
                        :
                        "";

                if (this.bridge) {
                    bridge.removeAllListeners("packet");

                    if (reason && reason !== "SocketClosed") {
                        const disconnectTime = getCurrentTime();

                        this.client.context.send(
                            new RawJSONBuilder()
                                .setExtra([
                                    new RawJSONBuilder()
                                        .setText(`${config.bridge.title} | §cСоединение разорвано. ${reason}`),
                                    separator,
                                    separator,
                                    ...(
                                        this.currentServer !== this.fallbackServer ?
                                            [
                                                new RawJSONBuilder()
                                                    .setText({
                                                        text: `   §7[§f${disconnectTime}§7]   `,
                                                        hoverEvent: {
                                                            action: "show_text",
                                                            value: new RawJSONBuilder()
                                                                .setText(`§7Вы были отключеный от сервера в §f${disconnectTime}§7.`)
                                                        }
                                                    })
                                            ]
                                            :
                                            []
                                    ),
                                    new RawJSONBuilder()
                                        .setText({
                                            text: "   §7[§fПереподключиться§7]   ",
                                            hoverEvent: {
                                                action: "show_text",
                                                value: new RawJSONBuilder()
                                                    .setText("§7Нажмите, чтобы переподключиться к серверу.")
                                            },
                                            clickEvent: {
                                                action: "run_command",
                                                value: `${PluginManager.prefix}connect ${host}:${port}`
                                            }
                                        })
                                ])
                        );

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
        this.client.removeAllListeners("packet");

        this.redirect(this.bridge, this.client);
        this.redirect(this.client, this.bridge);
    }

    private redirect(from: IClient, to: IClient) {
        const isFromServer = from === this.bridge;

        from.on("packet", (packet, meta) => {
            if (meta?.state === states.PLAY && from?.state === states.PLAY) {
                switch (meta.name) {
                    case "compress":
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
            this.client.context.end("Произошла ошибка при чтении файла с сессией.");

            console.log(error);
        }
    }

    static parseIP(ip: string | IParsedIP): string {
        return Object.values(
            typeof ip === "string" ?
                parseIP(ip)
                :
                ip
        )
            .join(":");
    }
}

export {
    PacketManager
};
