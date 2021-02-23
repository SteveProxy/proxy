import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../../Proxy";
import { PacketContext } from "../packetManager/PacketManager";

import { Page } from "./Page";
import { Item } from "./Item";
import { NBT } from "./NBT";

import { Inventory, Button, DefaultButtonsMap, IItemConstructor, ButtonAction /*RangeOf*/ } from "../../../interfaces";

// https://wiki.vg/Inventory
const inventoryTypes: Map<Inventory, number> = new Map([
    ["generic_9x1", 9],
    ["generic_9x2", 18],
    ["generic_9x3", 27],
    ["generic_9x4", 36],
    ["generic_9x5", 45],
    ["generic_9x6", 54],
    ["generic_3x3", 63],
    ["anvil", 3],
    ["beacon", 1],
    ["blast_furnace", 3],
    ["brewing_stand", 5],
    ["crafting", 10],
    ["enchantment", 2],
    ["furnace", 3],
    ["grindstone", 3],
    ["hopper", 5],
    ["lectern", 1],
    ["loom", 4],
    ["merchant", 3],
    ["shulker_box", 27],
    ["smoker", 3],
    ["cartography", 3],
    ["stonecutter", 2]
]);

const defaultButtons: Map<ButtonAction, Omit<IItemConstructor, "position">> = new Map([
    ["first", {
        id: 439,
        nbt: new NBT("compound", {
            display: new NBT("compound", {
                Name: new NBT("string", new RawJSONBuilder()
                    .setText({
                        text: "В начало",
                        color: "green"
                    })
                    .toString())
            })
        })
    }],
    ["back", {
        id: 262,
        nbt: new NBT("compound", {
            display: new NBT("compound", {
                Name: new NBT("string", new RawJSONBuilder()
                    .setText({
                        text: "Назад",
                        color: "green"
                    })
                    .toString())
            })
        })
    }],
    ["stop", {
        id: 166,
        nbt: new NBT("compound", {
            display: new NBT("compound", {
                Name: new NBT("string", new RawJSONBuilder()
                    .setText({
                        text: "Выход",
                        color: "red"
                    })
                    .toString())
            })
        })
    }],
    ["next", {
        id: 262,
        nbt: new NBT("compound", {
            display: new NBT("compound", {
                Name: new NBT("string", new RawJSONBuilder()
                    .setText({
                        text: "Вперёд",
                        color: "green"
                    })
                    .toString())
            })
        })
    }],
    ["last", {
        id: 436,
        nbt: new NBT("compound", {
            display: new NBT("compound", {
                Name: new NBT("string", new RawJSONBuilder()
                    .setText({
                        text: "В конец",
                        color: "green"
                    })
                    .toString())
            })
        })
    }]
]);

export class PagesBuilder {

    proxy: Proxy;

    windowId = 1;
    inventoryType = 0; // RangeOf<0, 22>
    inventoryTypeTag: Inventory = "generic_9x1";
    inventorySlots = 9; // RangeOf<1, 63>

    pages: Page[] = [];
    currentPage = 1;
    infinityLoop = true;
    defaultButtons: DefaultButtonsMap = new Map();

    constructor(proxy: Proxy) {
        this.proxy = proxy;
    }

    setInventoryType(type: Inventory): this {
        if (this.inventoryTypeTag === "generic_9x1") {
            const inventoryType = [...inventoryTypes].findIndex(([inventoryType]) => inventoryType === type);

            if (inventoryType >= 0 && inventoryType <= 22) {
                this.inventoryType = inventoryType; // as RangeOf<0, 22>
                this.inventoryTypeTag = type;
                this.inventorySlots = inventoryTypes.get(type) as number; // RangeOf<1, 63>
            } else {
                throw new Error(`Invalid inventory type ${type}.`);
            }

            return this;
        } else {
            throw new Error("Inventory type already set! Create new builder.");
        }
    }

    setPages(pages: Page | Page[]): this {
        pages = Array.isArray(pages) ? pages : [pages];

        this.pages = pages;

        return this;
    }

    addPages(pages: Page | Page[]): this {
        this.pages = this.pages.concat(pages);

        return this;
    }

    setPage(page: number): this {
        this.currentPage = page;

        this.rerender();

        return this;
    }

    getPage(pageNumber: number = this.currentPage): Page {
        const page = this.pages[pageNumber - 1]
            .clone();

        page.setItems([...this.defaultButtons].map(([, buttonItem]) => buttonItem));

        page.items = page.items.slice(0, this.inventorySlots);

        page.setItems(new Array(36) // 36 = player inventory slots without armor & etc.
            .fill(null)
            .map((_, index) => new Item({
                id: 410,
                position: this.inventorySlots + index,
                nbt: new NBT("compound", {
                    display: new NBT("compound", {
                        Name: new NBT("string", new RawJSONBuilder()
                            .setText("")
                            .toString())
                    })
                })
            })));

        return page;
    }

    setDefaultButtons(buttons: Button[]): this {
        const rawButtons: [ButtonAction, Item][] = buttons.map((button: Button) => {
            const [[buttonAction, { onClick, ...buttonObject }]] = Object.entries(button) as [ButtonAction, any][];

            return [buttonAction, new Item({
                onClick: () => {
                    if (onClick) {
                        onClick();
                    }

                    this.executeAction(buttonAction);
                },
                ...defaultButtons.get(buttonAction as ButtonAction),
                ...buttonObject
            })];
        });

        this.defaultButtons = new Map(rawButtons);

        return this;
    }

    executeAction(action: ButtonAction): void {
        switch (action) {
            case "first":
                if (this.currentPage === 1) {
                    if (this.infinityLoop) {
                        this.setPage(this.pages.length);
                    }

                    return;
                }

                this.setPage(1);

                break;
            case "back":
                if (this.currentPage === 1) {
                    if (this.infinityLoop) {
                        this.setPage(this.pages.length);
                    }

                    return;
                }

                this.setPage(this.currentPage - 1);

                break;
            case "stop":
                this.proxy.client.write("close_window", {
                    windowId: this.windowId
                });
                break;
            case "next":
                if (this.currentPage === this.pages.length) {
                    if (this.infinityLoop) {
                        this.setPage(1);
                    }

                    return;
                }

                this.setPage(this.currentPage + 1);

                break;
            case "last":
                if (this.currentPage === this.pages.length) {
                    if (this.infinityLoop) {
                        this.setPage(1);
                    }

                    return;
                }

                this.setPage(this.pages.length);

                break;
        }
    }

    build(): void {
        if (this.pages.length) {
            this.proxy.client.context.openWindow({
                windowId: this.windowId,
                inventoryType: this.inventoryType,
                ...this.getPage()
            });

            const windowClickListener = (context: PacketContext) => {
                const { packet: { slot } } = context;

                if (slot <= this.inventorySlots - 1) {
                    context.setCanceled(true);

                    const { triggers } = this.getPage();

                    const trigger = triggers.get(slot);

                    if (trigger) {
                        trigger(context);
                    }
                }

                this.proxy.client.context.dropItem();
                this.rerender();
            };

            this.proxy.packetManager.on("window_click", windowClickListener);
            this.proxy.packetManager.once("close_window", (context) => {
                context.setCanceled(true);

                this.proxy.packetManager.removeListener("window_click", windowClickListener);

                this.proxy.bridge.write("window_click", {
                    windowId: 0,
                    slot: 1,
                    mouseButton: 0,
                    action: 1,
                    mode: 0,
                    item: new Item({
                        id: 166,
                        position: 1,
                        nbt: new NBT("compound", {
                            display: new NBT("compound", {
                                Name: new NBT("string", new RawJSONBuilder()
                                    .setText("Proxy Restore Inventory")
                                    .toString())
                            })
                        })
                    })
                        .toJSON()
                });
            });
        } else {
            throw new Error("Pages not set.");
        }
    }

    rerender(): void {
        const { items } = this.getPage();

        this.proxy.client.write("window_items", {
            windowId: this.windowId,
            items
        });
    }
}

export { Page,
    Item,
    NBT };
