import { RawJSONBuilder } from "rawjsonbuilder";

import { Item } from "./Item";
import { PacketContext } from "../packetManager/PacketManager";

import { IItem, IPage } from "../../../interfaces";

export class Page {

    windowTitle: RawJSONBuilder = new RawJSONBuilder()
        .setText("");
    items: IItem[] = new Array(63)
        .fill({
            present: false
        });

    triggers: Map<number, (context: PacketContext) => unknown> = new Map();

    constructor({ triggers, items, windowTitle }: IPage = {}) {
        if (triggers) {
            this.triggers = triggers;
        }

        if (items) {
            this.items = items;
        }

        if (windowTitle) {
            this.windowTitle = windowTitle;
        }
    }

    setWindowTitle(title: RawJSONBuilder): this {
        this.windowTitle = title;

        return this;
    }

    setItems(items: Item | Item[]): this {
        items = Array.isArray(items) ? items : [items];

        items.forEach(({ position, onClick, ...item }) => {
            if (onClick) {
                this.triggers.set(position, onClick);
            }

            this.items[position] = {
                ...item,
                present: true
            };
        });

        return this;
    }

    clone() {
        return new Page({ ...this });
    }
}
