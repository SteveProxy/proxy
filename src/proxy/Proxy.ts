import minecraftPath from "minecraft-path";
import { createClient, Server, states } from "minecraft-protocol";

import { Context } from "./modules/Context";
import { PacketManager } from "./modules/packetManager/PacketManager";
import { PluginManager } from "./modules/PluginManager";

import { parseIP } from "../utils";

import { IClient, IConfig, IProxyOptions } from "../interfaces";

export class Proxy {

    readonly config: IConfig;

    client: IClient;
    protected server: Server;
    protected clientClosed = false;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bridge: IClient;
    protected bridgeClosed = false;

    packetManager: PacketManager;
    pluginManager: PluginManager;

    constructor({ server, client, config }: IProxyOptions) {
        client.context = new Context({
            client,
            proxy: this,
            type: "client"
        });
        
        this.config = config;

        this.client = client;
        this.server = server;

        this.packetManager = new PacketManager(this);
        this.pluginManager = new PluginManager(this);
    }

    async connect(ip = "192.168.1.51"): Promise<void> {
        const { proxy: { version, hideErrors } } = this.config;

        this.bridge = createClient({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            ...parseIP(ip), // @ts-ignore Invalid lib types
            ...await this.getSession(),
            version,
            hideErrors
        }) as IClient;

        this.bridge.context = new Context({
            client: this.bridge,
            proxy: this,
            type: "bridge"
        });

        this.start();

        const bridgeDisconnectEvents = [
            "disconnect",
            "error",
            "end"
        ];

        bridgeDisconnectEvents.forEach((event) => {
            this.bridge.once(event, (data) => {
                const reason = data?.reason || data || "";

                this.client.context.end(`Соединение разорвано.\n${reason}`);
                this.close("bridge");

                console.error(reason);
            });
        });

        this.client.once("end", () => {
            this.bridge.end("");
            this.close("client");
        });
    }

    private start() {
        this.pluginManager
            .start();

        this.redirect(this.bridge, this.client);

        setTimeout(() => {
            if (this.bridge) {
                this.redirect(this.client, this.bridge);
            }
        }, 1);
    }

    private redirect(from: IClient, to: IClient) {
        const isFromServer = from === this.bridge;

        from.on("packet", (packet, meta) => {
            if (
                meta.state === states.PLAY &&
                from.state === states.PLAY &&
                !(this.clientClosed && this.bridgeClosed)
            ) {
                if (meta.name === "compress") {
                    to.compressionThreshold = packet.threshold;
                    from.compressionThreshold = packet.threshold;
                } else {
                    this.packetManager.packetSwindler({
                        packet,
                        meta,
                        isFromServer,
                        send: (data: any) => to.write(meta.name, data)
                    });
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
            this.packetManager.stop();
        }
    }

    async getSession(): Promise<any> {
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
