import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../Proxy";
import { Plugin } from "./Plugin";
import { Item, NBT, Page } from "../modules/pagesBuilder/PagesBuilder";

import { config } from "../../config";

export class Core extends Plugin {

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "core",
            description: "Ядро",
            prefix: ""
        });

        this.meta.commands = [
            {
                name: "test",
                handler: this.test
            }
        ];
    }

    start(): void {
        this.proxy.client.context.sendTab({
            header: new RawJSONBuilder()
                .parse(`${config.bridge.title}\n§r`)
        });
    }

    test(): void {
        const builder = this.proxy.client.context.pagesBuilder();

        builder.setPages([
            new Page()
                .setWindowTitle(new RawJSONBuilder()
                    .setText("test"))
                .setItems(new Item({
                    id: 1,
                    position: 0,
                    nbt: new NBT("compound", {
                        display: new NBT("compound", {
                            Name: new NBT("string", new RawJSONBuilder()
                                .setText({
                                    text: "test",
                                    color: "yellow",
                                    strikethrough: true
                                })
                                .toString())
                        })
                    }),
                    onClick: () => {
                        this.proxy.client.context.send("TEST");
                        builder.setPage(2);
                    }
                })),
            new Page()
                .setWindowTitle(new RawJSONBuilder()
                    .setText("test"))
                .setItems(new Item({
                    id: 12,
                    position: 2,
                    nbt: new NBT("compound", {
                        display: new NBT("compound", {
                            Name: new NBT("string", new RawJSONBuilder()
                                .setText({
                                    text: "test",
                                    color: "yellow",
                                    strikethrough: true
                                })
                                .toString())
                        })
                    }),
                    onClick: () => {
                        this.proxy.client.context.send("TEST");
                        builder.setPage(1);
                    }
                }))
        ])
            .setDefaultButtons({ next: { position: 1 } })
            .build();
    }
}
