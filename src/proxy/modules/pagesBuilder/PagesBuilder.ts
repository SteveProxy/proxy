import chunk from 'chunk';
import { text } from 'rawjsonbuilder';

import { minecraftData } from '../../../utils';

import { Proxy } from '../../Proxy';
import { PacketContext } from '../packetManager/PacketManager';

import { Page } from './components/Page';
import { Item } from './components/Item';
import { NBT } from './components/NBT';

import { Inventory, Buttons, DefaultButtonsMap, IItemConstructor, IAutoGeneratePagesOptions, ButtonAction, RawPage /*RangeOf*/ } from '../../../interfaces';

// https://wiki.vg/Inventory
const inventoryTypes: Map<Inventory, number> = new Map([
    ['generic_9x1', 9],
    ['generic_9x2', 18],
    ['generic_9x3', 27],
    ['generic_9x4', 36],
    ['generic_9x5', 45],
    ['generic_9x6', 54],
    ['generic_3x3', 63],
    ['anvil', 3],
    ['beacon', 1],
    ['blast_furnace', 3],
    ['brewing_stand', 5],
    ['crafting', 10],
    ['enchantment', 2],
    ['furnace', 3],
    ['grindstone', 3],
    ['hopper', 5],
    ['lectern', 1],
    ['loom', 4],
    ['merchant', 3],
    ['shulker_box', 27],
    ['smoker', 3],
    ['cartography', 3],
    ['stonecutter', 2]
]);

const defaultButtons: Map<ButtonAction, Omit<IItemConstructor, 'position'>> = new Map([
    ['first', {
        id: minecraftData.findItemOrBlockByName('spectral_arrow').id,
        nbt: new NBT('compound', {
            display: new NBT('compound', {
                Name: new NBT('string', (
                    text('В начало', 'green')
                        .setItalic(false)
                ))
            })
        })
    }],
    ['back', {
        id: minecraftData.findItemOrBlockByName('arrow').id,
        nbt: new NBT('compound', {
            display: new NBT('compound', {
                Name: new NBT('string', (
                    text('Назад', 'green')
                        .setItalic(false)
                ))
            })
        })
    }],
    ['stop', {
        id: minecraftData.findItemOrBlockByName('barrier').id,
        nbt: new NBT('compound', {
            display: new NBT('compound', {
                Name: new NBT('string', (
                    text('Выход', 'red')
                        .setItalic(false)
                ))
            })
        })
    }],
    ['next', {
        id: minecraftData.findItemOrBlockByName('arrow').id,
        nbt: new NBT('compound', {
            display: new NBT('compound', {
                Name: new NBT('string', (
                    text('Вперёд', 'green')
                        .setItalic(false)
                ))
            })
        })
    }],
    ['last', {
        id: minecraftData.findItemOrBlockByName('spectral_arrow').id,
        nbt: new NBT('compound', {
            display: new NBT('compound', {
                Name: new NBT('string', (
                    text('В конец', 'green')
                        .setItalic(false)
                ))
            })
        })
    }]
]);

export class PagesBuilder {

    readonly proxy: Proxy;

    private windowId = 100;
    private inventoryType = 0; // RangeOf<0, 22>
    private inventoryTypeTag: Inventory = 'generic_9x1';
    private inventorySlots = 9; // RangeOf<1, 63>

    private pages: RawPage[] = [];
    private currentPage = 1;
    private paginationFormat = '§7%c / %m';
    private infinityLoop = true;
    private autoRerenderInterval = 0;
    private defaultButtons: DefaultButtonsMap = new Map();

    private built = false;
    private stopped = false;

    constructor(proxy: Proxy) {
        this.proxy = proxy;
    }

    setInventoryType(type: Inventory): this {
        const inventoryType = [...inventoryTypes].findIndex(([inventoryType]) => inventoryType === type);

        if (inventoryType >= 0 && inventoryType <= 22) {
            this.inventoryType = inventoryType; // as RangeOf<0, 22>
            this.inventoryTypeTag = type;
            this.inventorySlots = inventoryTypes.get(type) as number; // RangeOf<1, 63>
        } else {
            throw new Error(`Invalid inventory type ${type}.`);
        }

        return this;
    }

    setPages(pages: RawPage | RawPage[]): this {
        pages = Array.isArray(pages) ? pages : [pages];

        this.pages = pages;

        return this;
    }

    addPages(pages: RawPage | RawPage[]): this {
        this.pages = this.pages.concat(pages);

        return this;
    }

    autoGeneratePages({ items, windowTitle }: IAutoGeneratePagesOptions): this {
        if (this.inventorySlots >= 27 && this.inventorySlots <= 54 && this.inventorySlots % 9 === 0) {
            const chunkedItems = chunk(items, 7 * (this.inventorySlots / 9));

            this.setPages(
                chunkedItems.map((items) => new Page({
                    windowTitle
                })
                    .setItems(
                        items.map((item, index) => new Item({
                            ...item,
                            position: 10 + index + (2 * Math.trunc(index / 7)) // 2 = offset, 7 = items count on line
                        }))
                    ))
            );
        } else {
            throw new Error('Unsupported inventory type for this method!');
        }

        return this;
    }

    setPage(page: number): void {
        this.currentPage = page;

        this.rerender();
    }

    setDefaultButtons(buttons: Buttons): this {
        const rawButtons: [ButtonAction, Item][] = (Object.entries(buttons) as [ButtonAction, any][])
            .map(([buttonAction, { onClick, ...buttonObject }]) => [
                buttonAction,
                new Item({
                    onClick: () => {
                        if (onClick) {
                            onClick();
                        }

                        this.executeAction(buttonAction);
                    },
                    ...defaultButtons.get(buttonAction as ButtonAction),
                    ...buttonObject
                })
            ]);

        this.defaultButtons = new Map(rawButtons);

        return this;
    }

    setAutoRerenderInterval(interval: number): this {
        this.autoRerenderInterval = interval;

        return this;
    }

    setPaginationFormat(template: string): this {
        this.paginationFormat = template;

        return this;
    }

    setInfinityLoop(infinityLoop = true): this {
        this.infinityLoop = infinityLoop;

        return this;
    }

    async getPage(pageNumber: number = this.currentPage): Promise<Page> {
        const rawPage = this.pages[pageNumber - 1];

        const page = (
            typeof rawPage === 'function' ?
                await rawPage()
                :
                rawPage
        )
            .clone();

        if (this.pages.length > 1) {
            const pagination = new NBT('list', new NBT('string', [
                text(''),
                text(
                    this.paginationFormat
                        .replace('%c', String(this.currentPage))
                        .replace('%m', String(this.pages.length))
                )
            ]));

            page.setItems(
                [...this.defaultButtons].filter(([action]) => !this.infinityLoop ?
                    !(
                        (this.currentPage === 1 && (action === 'first' || action === 'back')) ||
                        (this.currentPage === this.pages.length && (action === 'last' || action === 'next'))
                    )
                    :
                    true)
                    .map(([, buttonItem]) => {
                        buttonItem.nbtData.value.display.value.Lore = pagination;

                        return buttonItem;
                    })
            );
        }

        page.items = page.items.slice(0, this.inventorySlots);

        page.setItems(new Array(36) // 36 = player inventory slots without armor & etc.
            .fill(null)
            .map((_, index) => new Item({
                id: minecraftData.findItemOrBlockByName('black_stained_glass_pane').id,
                position: this.inventorySlots + index,
                nbt: new NBT('compound', {
                    display: new NBT('compound', {
                        Name: new NBT('string', text(''))
                    })
                })
            })));

        return page;
    }

    executeAction(action: ButtonAction): void {
        switch (action) {
            case 'first':
                if (this.currentPage === 1) {
                    if (this.infinityLoop) {
                        this.setPage(this.pages.length);
                    }

                    return;
                }

                this.setPage(1);

                break;
            case 'back':
                if (this.currentPage === 1) {
                    if (this.infinityLoop) {
                        this.setPage(this.pages.length);
                    }

                    return;
                }

                this.setPage(this.currentPage - 1);

                break;
            case 'stop':
                this.stop();
                break;
            case 'next':
                if (this.currentPage === this.pages.length) {
                    if (this.infinityLoop) {
                        this.setPage(1);
                    }

                    return;
                }

                this.setPage(this.currentPage + 1);

                break;
            case 'last':
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

    stop(): void {
        this.stopped = true;
        this.built = false;

        this.proxy.client.write('close_window', {
            windowId: this.windowId
        });

        this.proxy.packetManager.packetSwindler({
            meta: {
                name: 'close_window',
                state: this.proxy.client.state
            },
            packet: {
                windowId: this.windowId
            },
            isFromServer: false,
            send: () => null
        });
    }

    async build(): Promise<void> {
        if (!this.pages.length) {
            throw new Error('Pages not set.');
        }

        if (!this.built) {
            this.built = true;

            if (this.stopped) {
                this.stopped = false;
            }

            this.proxy.client.context.openWindow({
                windowId: this.windowId,
                inventoryType: this.inventoryType,
                ...await this.getPage()
            });

            const setSlotListener = (context: PacketContext) => {
                context.setCanceled(true);
            };

            const windowClickListener = async (context: PacketContext) => {
                const { packet: { slot } } = context;

                this.proxy.client.context.dropItem();
                this.rerender();

                if (slot <= this.inventorySlots - 1) {
                    context.setCanceled(true);

                    const { triggers } = await this.getPage();

                    const trigger = triggers.get(slot);

                    if (trigger) {
                        trigger(context);
                    }
                }
            };

            this.proxy.packetManager.on('window_click', windowClickListener);
            this.proxy.packetManager.on('set_slot', setSlotListener);

            const autoRerenderInterval = this.autoRerenderInterval ?
                setInterval(() => {
                    if (this.proxy.client.ended && autoRerenderInterval) {
                        clearInterval(autoRerenderInterval);
                    }

                    this.rerender();
                }, this.autoRerenderInterval)
                :
                null;

            this.proxy.packetManager.once(['close_window', 'respawn'], (context) => {
                context.setCanceled(true);

                this.stopped = true;
                this.built = false;

                this.proxy.packetManager.removeListener('window_click', windowClickListener);
                this.proxy.packetManager.removeListener('set_slot', setSlotListener);

                if (autoRerenderInterval) {
                    clearInterval(autoRerenderInterval);
                }

                this.proxy.bridge.write('window_click', {
                    windowId: 0,
                    slot: 1,
                    mouseButton: 0,
                    mode: 0,
                    changedSlots: [],
                    clicked_item: new Item({
                        id: 1,
                        position: 1,
                        nbt: new NBT('compound', {
                            display: new NBT('compound', {
                                Name: new NBT('string', text('SteveProxy Restore Inventory'))
                            })
                        })
                    })
                        .toJSON()
                });
            });

            return;
        }

        this.rerender();
    }

    async rerender(): Promise<void> {
        if (this.stopped) {
            return;
        }

        const { items } = await this.getPage();

        this.proxy.client.write('window_items', {
            windowId: this.windowId,
            items
        });
    }
}

export * from './gui';

export {
    Page,
    Item,
    NBT
};
