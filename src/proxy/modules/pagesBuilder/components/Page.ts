import { ComponentsUnion, TextComponent } from 'rawjsonbuilder';

import { PacketContext } from '../../packetManager';
import { Item } from './Item';

import { IItem } from '../../context';
import { IPage } from '../types';

export class Page {

    windowTitle: ComponentsUnion = new TextComponent()
        .setText('');
    items: IItem[] = new Array(63)
        .fill({
            present: false
        });
    triggers = new Map<number, (context: PacketContext) => unknown>();

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

    setWindowTitle(title: ComponentsUnion): this {
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

    clone(): Page {
        return new Page({
            ...this
        });
    }
}
