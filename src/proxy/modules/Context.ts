import { RawJSONBuilder } from "rawjsonbuilder";

import { config } from "../../config";

import { PagesBuilder } from "./pagesBuilder/PagesBuilder";
import { ChatBuilder } from "./chatManager/ChatBuilder";

import { SendTitleOptions, ISendTabOptions, IOpenWindowOptions, ISetCooldownOptions, SetCooldownOptions, IContext, SendOptions } from "../../interfaces";

const { bridge: { title } } = config;

export class Context {

    client: IContext["client"];
    proxy: IContext["proxy"];
    type: IContext["type"];

    constructor({ client, proxy, type }: IContext) {
        this.client = client;
        this.proxy = proxy;
        this.type = type;
    }

    end(reason: string): void {
        this.client.end(`${title}\n\n${reason}`);
    }

    send(options: SendOptions): void {
        if (typeof options === "object") {
            if (options instanceof RawJSONBuilder) {
                options = {
                    message: options
                };
            }

            const { message, useRawJSON = true, position = 0, sender = "0" } = options;

            return this.client.write("chat", {
                message: useRawJSON ?
                    (
                        message instanceof RawJSONBuilder ?
                            message
                            :
                            new RawJSONBuilder()
                                .setText(message)
                    )
                        .toString()
                    :
                    message,
                position,
                sender
            });
        }

        this.client.write("chat", {
            message: this.type === "bridge" ?
                options
                :
                new RawJSONBuilder()
                    .setText(options)
                    .toString(),
            position: 0,
            sender: "0"
        });
    }

    sendTitle(options: SendTitleOptions): void {
        if (typeof options === "string") {
            options = {
                title: options
            };
        }

        const { title, subtitle, actionbar, fadeIn, fadeOut, stay, hide, reset } = options;

        if (subtitle) {
            this.client.write("title", {
                action: 1,
                text: new RawJSONBuilder()
                    .setText("")
                    .setExtra(
                        new RawJSONBuilder()
                            .setText({
                                text: subtitle
                            })
                    )
                    .toString()
            });
        }

        if (title) {
            this.client.write("title", {
                action: 0,
                text: new RawJSONBuilder()
                    .setText("")
                    .setExtra(
                        new RawJSONBuilder()
                            .setText({
                                text: title
                            })
                    )
                    .toString()
            });
        }

        if (actionbar) {
            this.client.write("title", {
                action: 2,
                text: new RawJSONBuilder()
                    .setText("")
                    .setExtra(
                        new RawJSONBuilder()
                            .setText({
                                text: actionbar
                            })
                    )
                    .toString()
            });
        }

        if (fadeIn !== undefined || fadeOut !== undefined || stay !== undefined) {
            this.client.write("title", {
                action: 3,
                fadeIn,
                stay,
                fadeOut
            });
        }

        if (hide) {
            this.client.write("title", {
                action: 4
            });
        }

        if (reset) {
            this.client.write("title", {
                action: 5
            });
        }
    }

    sendTab({ header = new RawJSONBuilder().setText(""), footer = new RawJSONBuilder().setText("") }: ISendTabOptions): void {
        this.client.write("playerlist_header", {
            header: header.toString(),
            footer: footer.toString()
        });
    }

    sendBossBar(): void {
        // todo
    }

    openWindow({ windowTitle = new RawJSONBuilder().setText(""), inventoryType = 2, windowId, items }: IOpenWindowOptions): void {
        this.client.write("open_window", {
            windowId,
            inventoryType,
            windowTitle: windowTitle.toString()
        });

        if (items) {
            this.client.write("window_items", {
                windowId,
                items
            });
        }
    }

    dropItem(): void {
        this.client.write("set_slot", {
            windowId: -1,
            slot: -1,
            item: {
                present: false
            }
        });
    }

    setCooldown(options: SetCooldownOptions): void {
        options = typeof options === "object" ?
            options
            :
            {
                id: options
            };

        let { id, cooldown = 1 } = options as ISetCooldownOptions;

        id = Array.isArray(id) ? id : [id];

        id.forEach((id) => {
            this.client.write("set_cooldown", {
                itemID: id,
                cooldownTicks: cooldown * 20
            });
        });
    }

    pagesBuilder(): PagesBuilder {
        return new PagesBuilder(this.proxy);
    }

    chatBuilder(): ChatBuilder {
        return new ChatBuilder(this.proxy);
    }
}
