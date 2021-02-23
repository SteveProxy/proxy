import { Client } from "minecraft-protocol";
import { RawJSONBuilder } from "rawjsonbuilder";

import { config } from "../../config";

import { PagesBuilder } from "./pagesBuilder/PagesBuilder";
import { Proxy } from "../Proxy";

import { IContext, Title, Tab, IOpenWindow } from "../../interfaces";

const { bridge: { title } } = config;

const contextMethods: (keyof IContext)[] = [
    "end",
    "send",
    "sendTitle",
    "sendTab",
    "openWindow",
    "pagesBuilder",
    "dropItem"
];

export class Context {

    static wrap(client: any): void {
        client.context = {};

        contextMethods.forEach((method) => {
            client.context[method] = Context[method].bind(client);
        });
    }

    private static end(reason: string): void {
        const client = this;

        client.end(`${title}\n\n${reason}`);
    }

    private static send(message: RawJSONBuilder | string): void {
        const client = this as unknown as Client;

        client.write("chat", {
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

    private static sendTitle(params: Title): void {
        const client = this as unknown as Client;

        if (typeof params === "string") {
            params = {
                title: params
            };
        }

        const { title, subtitle, actionbar, fadeIn, fadeOut, stay, hide, reset } = params;

        if (subtitle) {
            return client.write("title", {
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
            client.write("title", {
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
            client.write("title", {
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
            return client.write("title", {
                action: 3,
                fadeIn,
                stay,
                fadeOut
            });
        }

        if (hide) {
            client.write("title", {
                action: 4
            });
        }

        if (reset) {
            client.write("title", {
                action: 5
            });
        }
    }

    private static sendTab(params: Tab): void {
        const client = this as unknown as Client;

        const { header, footer } = params;

        client.write("playerlist_header",{
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

    private static sendBossBar(): void {
        // todo
    }

    private static openWindow(params: IOpenWindow): void {
        const client = this as unknown as Client;

        const { windowTitle = new RawJSONBuilder().setText(""), inventoryType = 2, windowId, items } = params;

        client.write("open_window", {
            windowId,
            inventoryType,
            windowTitle: windowTitle.toString()
        });

        if (items) {
            client.write("window_items", {
                windowId,
                items
            });
        }
    }

    private static dropItem(): void {
        const client = this as unknown as Client;

        client.write("set_slot", {
            windowId: -1,
            slot: -1,
            item: {
                present: false
            }
        });
    }

    private static pagesBuilder(proxy: Proxy): PagesBuilder {
        return new PagesBuilder(proxy);
    }
}
