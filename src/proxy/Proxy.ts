import minecraftPath from "minecraft-path";
import { RawJSONBuilder } from "rawjsonbuilder";
import { createClient, Server, states } from "minecraft-protocol";

import { Context } from "./modules/Context";
import { PacketManager } from "./modules/packetManager/PacketManager";
import { PluginManager } from "./modules/PluginManager";

import { db } from "../DB";
import { config } from "../config";

import { IClient, IConfig, IParsedIP, IProxyOptions } from "../interfaces";

export class Proxy {

    client: IClient;
    protected server: Server;
    protected clientClosed = false;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bridge: IClient;
    protected bridgeClosed = false;

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
        return db.get("")
            .value();
    }

    async start(): Promise<void> {
        this.bridge = await this.createBridge(
            db.get("lobby")
                .value()
        );

        this.pluginManager
            .start();

        this.startRedirect();

        this.client.once("end", () => {
            this.bridge.end("");
            this.close("client");
        });
    }

    // Method doesnt work, infinity loading terrain
    /*async connect(ip: string): Promise<void> {
        const bridge = await this.createBridge(
            parseIP(ip)
        );

        const packetsCache: [string, any][] = [];
        const packetsHandler = (packet: any, meta: any) => packetsCache.push([meta.name, packet]);

        bridge.on("packet", packetsHandler);

        bridge.once("login", (packet) => {
            this.bridge.end("");

            this.bridge = bridge;

            this.startRedirect();

            bridge.removeListener("packet", packetsHandler);
            packetsCache.forEach(([name, packet]) => this.bridge.write(name, packet));
            this.client.write("login", packet);

            this.pluginManager.restart();
        });
    }*/

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

                this.client.context.end(`Соединение разорвано.\n\n${reason}`);
                this.close("bridge");

                console.error(reason);
            });
        });

        return bridge;
    }

    private startRedirect(): void {
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
}

export {
    PacketManager
};
