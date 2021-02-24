import { RawJSONBuilder } from "rawjsonbuilder";

import { config } from "../../config";

import { PagesBuilder } from "./pagesBuilder/PagesBuilder";
import { Proxy } from "../Proxy";

import { Title, Tab, IOpenWindow, IClient } from "../../interfaces";

const { bridge: { title } } = config;

export class Context {

    client: IClient;

    constructor(client: IClient) {
        this.client = client;
    }

    end(reason: string): void {
        this.client.end(`${title}\n\n${reason}`);
    }

    send(message: RawJSONBuilder | string): void {
        this.client.write("chat", {
            message: (
                message instanceof RawJSONBuilder ?
                    message
                    :
                    new RawJSONBuilder()
                        .setText("")
                        .setExtra(
                            new RawJSONBuilder()
                                .setText({
                                    text: message
                                })
                        )
            )
                .toString(),
            position: 0,
            sender: "0"
        });
    }

    sendTitle(params: Title): void {
        if (typeof params === "string") {
            params = {
                title: params
            };
        }

        const { title, subtitle, actionbar, fadeIn, fadeOut, stay, hide, reset } = params;

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

    sendTab({ header, footer }: Tab): void {
        this.client.write("playerlist_header", {
            header: header ?
                header.toString()
                :
                new RawJSONBuilder()
                    .setText("")
                    .toString(),
            footer: footer ?
                footer.toString()
                :
                new RawJSONBuilder()
                    .setText("")
                    .toString()
        });
    }

    sendBossBar(): void {
        // todo
    }

    openWindow({ windowTitle = new RawJSONBuilder().setText(""), inventoryType = 2, windowId, items }: IOpenWindow): void {
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

    pagesBuilder(proxy: Proxy): PagesBuilder {
        return new PagesBuilder(proxy);
    }
}
