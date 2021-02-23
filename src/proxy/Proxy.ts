import { createClient, Server, states } from "minecraft-protocol";
import minecraftPath from "minecraft-path";

import { Context } from "./modules/Context";
import { PacketManager } from "./modules/packetManager/PacketManager";
import { PluginManager } from "./modules/PluginManager";

import { parseIP } from "../utils";

import { IClient, IConfig, IProxyOptions } from "../interfaces";

export class Proxy {

    readonly config: IConfig;

    client: IClient;
    protected server: Server;
    protected clientClosed: boolean;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    bridge: IClient;
    protected bridgeClosed: boolean;

    packetManager: PacketManager;
    pluginManager: PluginManager;

    constructor({ server, client, config }: IProxyOptions) {
        this.config = config;

        this.client = client;
        this.server = server;

        this.bridgeClosed = false;
        this.clientClosed = false;

        this.packetManager = new PacketManager(this);
        this.pluginManager = new PluginManager(this);
    }

    async connect(ip = "192.168.1.51"): Promise<void> {
        const { proxy: { version, hideErrors } } = this.config;

        this.bridge = createClient({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            ...parseIP(ip), // @ts-ignore Invalid lib types
            ...(await this.getSession()),
            version,
            hideErrors
        }) as IClient;

        Context.wrap(this.bridge);

        this.start();

        this.bridge.once("disconnect", ({ reason }) => {
            this.client.context.end(`Соединение разорвано.\n${reason}`);
            this.close("bridge");
        });

        this.bridge.once("end", () => {
            this.client.context.end("Соединение разорвано.");
            this.close("bridge");
        });

        this.bridge.once("error", (error) => {
            this.client.context.end(`Соединение разорвано\n${error}`);
            this.close("bridge");

            console.error(error);
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

export { PacketManager };
