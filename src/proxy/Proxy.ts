import minecraftPath from "minecraft-path";
import { RawJSONBuilder } from "rawjsonbuilder";
import { createClient, Server, states } from "minecraft-protocol";

import { Context } from "./modules/Context";
import { PacketManager } from "./modules/packetManager/PacketManager";
import { PluginManager } from "./modules/PluginManager";

import { db } from "../DB";
import { config } from "../config";

import { parseIP } from "../utils";

import { IClient, IConfig, IParsedIP, IProxyOptions } from "../interfaces";

export class Proxy {

    client: IClient;
    private server: Server;
    private clientClosed = false;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bridge: IClient;
    currentServer = Proxy.parseIP(
        this.config.lobby
    );
    private bridgeClosed = false;
    private connectionStarted = false;

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
        return db.value();
    }

    start(): void {
        this.connect(this.currentServer);

        this.client.once("end", () => {
            if (this.bridge) {
                this.bridge.end("");
            }

            this.close("client");
        });
    }

    // Method doesnt work, infinity loading terrain
    async connect(ip: string): Promise<void> {
        if (this.connectionStarted) {
            this.client.context.send(`${config.bridge.title} | §cДождидесь окончания предыдущей попытки подключения!`);
        }

        if (this.bridge) {
            this.client.context.send(`${config.bridge.title} | Подключение к серверу...`);
        }

        this.connectionStarted = true;

        const bridge = await this.createBridge(
            parseIP(ip)
        );

        const isLobby = ip === Proxy.parseIP(this.config.lobby);

        bridge.once("login", (packet) => {
            this.connectionStarted = false;
            this.currentServer = ip;

            if (this.bridge) {
                this.bridge.end("");
            }

            this.bridge = bridge;

            this.startRedirect();

            this.client.write("login", packet);
            this.client.write("respawn", {
                dimension: packet.dimension,
                worldName: packet.worldName,
                hashedSeed: packet.hashedSeed,
                gamemode: packet.gameMode,
                previousGamemode: packet.previousGamemode,
                isDebug: packet.isDebug,
                isFlat: packet.isFlat,
                copyMetadata: true
            });

            this.pluginManager.restart();

            if (isLobby) {
                const connectCommand = this.pluginManager.commands.get("connect");

                if (connectCommand) {
                    connectCommand.handler();
                }
            }
        });
    }

    private async createBridge({ host, port }: IParsedIP): Promise<IClient> {
        const bridge = createClient({
            ...config.proxy,
            host,
            port,
            ...(await Proxy.getSession())
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

        bridgeDisconnectEvents.forEach((event) => {
            bridge.once(event, (data) => {
                const reason = data?.reason ?
                    new RawJSONBuilder(data?.reason)
                        .toRawString()
                    :
                    data || "";

                if (this.bridge) {
                    bridge.removeAllListeners("packet");

                    if (reason !== "SocketClosed") {
                        this.client.context.send(`${config.bridge.title} | Соединение разорвано. ${reason}`);
                    }

                    if (this.bridge === bridge) {
                        if (this.currentServer !== Proxy.parseIP(this.config.lobby)) {
                            this.connect(
                                Proxy.parseIP(
                                    this.config.lobby
                                )
                            );
                        }
                    }
                } else {
                    this.client.context.end(`Соединение разорвано.\n\n${reason}`);
                    this.close("bridge");
                }

                this.connectionStarted = false;

                console.error(reason);
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
            if (
                meta?.state === states.PLAY &&
                from?.state === states.PLAY &&
                !(this.clientClosed && this.bridgeClosed)
            ) {
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

    private close(channel: "bridge" | "client"): void {
        const context = `${channel}Closed` as ("bridgeClosed" | "clientClosed");

        if (!this[context]) {
            this[context] = true;
        }

        if (channel === "client") {
            this.pluginManager.stop();
            this.packetManager.clear();
        }
    }

    private static async getSession(): Promise<any> {
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

export {
    PacketManager
};
