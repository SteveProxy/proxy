import chunk from 'chunk';
import { text } from 'rawjsonbuilder';

import { minecraftData } from '../../../utils';

import { Proxy } from '../../index';
import { PacketContext } from '../packetManager';

import { Item, NBT, Page } from './components';

import {
    ButtonAction,
    Buttons,
    IAutoGeneratePagesOptions,
    IItemConstructor,
    Inventory,
    InventoryIndex,
    RawPage
} from './types';

// https://wiki.vg/Inventory
const inventoryTypes = new Map<Inventory, IItemConstructor['count']>([
    [Inventory.GENERIC_9X1, 9],
    [Inventory.GENERIC_9X2, 18],
    [Inventory.GENERIC_9X3, 27],
    [Inventory.GENERIC_9X4, 36],
    [Inventory.GENERIC_9X5, 45],
    [Inventory.GENERIC_9X6, 54],
    [Inventory.GENERIC_3X3, 63],
    [Inventory.ANVIL, 3],
    [Inventory.BEACON, 1],
    [Inventory.BLAST_FURNACE, 3],
    [Inventory.BREWING_STAND, 5],
    [Inventory.CRAFTING, 10],
    [Inventory.ENCHANTMENT, 2],
    [Inventory.FURNACE, 3],
    [Inventory.GRINDSTONE, 3],
    [Inventory.HOPPER, 5],
    [Inventory.LECTERN, 1],
    [Inventory.LOOM, 4],
    [Inventory.MERCHANT, 3],
    [Inventory.SHULKER_BOX, 27],
    [Inventory.SMITHING, 3],
    [Inventory.SMOKER, 3],
    [Inventory.CARTOGRAPHY, 3],
    [Inventory.STONECUTTER, 2]
]);

const defaultButtons = new Map<ButtonAction, Omit<IItemConstructor, 'position'>>([
    [ButtonAction.FIRST, {
        id: minecraftData.findItemOrBlockByName('spectral_arrow').id,
        nbt: NBT.compound({
            display: NBT.compound({
                Name: NBT.string(
                    text('В начало', 'green')
                        .setItalic(false)
                )
            })
        })
    }],
    [ButtonAction.BACK, {
        id: minecraftData.findItemOrBlockByName('arrow').id,
        nbt: NBT.compound({
            display: NBT.compound({
                Name: NBT.string(
                    text('Назад', 'green')
                        .setItalic(false)
                )
            })
        })
    }],
    [ButtonAction.STOP, {
        id: minecraftData.findItemOrBlockByName('barrier').id,
        nbt: NBT.compound({
            display: NBT.compound({
                Name: NBT.string(
                    text('Выход', 'red')
                        .setItalic(false)
                )
            })
        })
    }],
    [ButtonAction.NEXT, {
        id: minecraftData.findItemOrBlockByName('arrow').id,
        nbt: NBT.compound({
            display: NBT.compound({
                Name: NBT.string(
                    text('Вперёд', 'green')
                        .setItalic(false)
                )
            })
        })
    }],
    [ButtonAction.LAST, {
        id: minecraftData.findItemOrBlockByName('spectral_arrow').id,
        nbt: NBT.compound({
            display: NBT.compound({
                Name: NBT.string(
                    text('В конец', 'green')
                        .setItalic(false)
                )
            })
        })
    }]
]);

export class PagesBuilder {

    readonly proxy: Proxy;

    #windowId = 100;
    #inventoryType!: InventoryIndex;
    #inventoryTypeTag!: Inventory;
    #inventorySlots!: Exclude<IItemConstructor['count'], undefined>;

    #pages: RawPage[] = [];
    #currentPage = 1;
    #paginationFormat = '§7%c / %m';
    #infinityLoop = true;
    #autoRerenderInterval = 0;
    #defaultButtons = new Map<ButtonAction, Item>();

    #built = false;
    #stopped = false;

    constructor(proxy: Proxy) {
        this.proxy = proxy;

        this.setInventoryType(Inventory.GENERIC_9X1);
    }

    setInventoryType(type: Inventory): this {
        const inventoryType = [...inventoryTypes].findIndex(([inventoryType]) => inventoryType === type);

        if (inventoryType >= 0 && inventoryType <= inventoryTypes.size - 1) {
            this.#inventoryType = inventoryType as InventoryIndex;
            this.#inventoryTypeTag = type;
            this.#inventorySlots = inventoryTypes.get(type)!;
        } else {
            throw new Error(`Invalid inventory type ${type}.`);
        }

        return this;
    }

    setPages(pages: RawPage | RawPage[]): this {
        pages = Array.isArray(pages) ? pages : [pages];

        this.#pages = pages;

        return this;
    }

    addPages(pages: RawPage | RawPage[]): this {
        this.#pages = this.#pages.concat(pages);

        return this;
    }

    autoGeneratePages({ items, windowTitle }: IAutoGeneratePagesOptions): this {
        if (this.#inventorySlots >= 27 && this.#inventorySlots <= 54 && this.#inventorySlots % 9 === 0) {
            const chunkedItems = chunk(items, 7 * (this.#inventorySlots / 9));

            const initialPosition = 10;
            const offset = 2;
            const lineItemsCount = 7;

            this.setPages(
                chunkedItems.map((items) => new Page({
                    windowTitle
                })
                    .setItems(
                        items.map((item, index) => new Item({
                            ...item,
                            position: initialPosition + index + (offset * Math.trunc(index / lineItemsCount)) as IItemConstructor['position']
                        }))
                    ))
            );
        } else {
            throw new Error('Unsupported inventory type for this method!');
        }

        return this;
    }

    setPage(page: number): void {
        this.#currentPage = page;

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

        this.#defaultButtons = new Map(rawButtons);

        return this;
    }

    setAutoRerenderInterval(interval: number): this {
        this.#autoRerenderInterval = interval;

        return this;
    }

    setPaginationFormat(template: string): this {
        this.#paginationFormat = template;

        return this;
    }

    setInfinityLoop(infinityLoop = true): this {
        this.#infinityLoop = infinityLoop;

        return this;
    }

    async getPage(pageNumber: number = this.#currentPage): Promise<Page> {
        const rawPage = this.#pages[pageNumber - 1];

        const page = (
            typeof rawPage === 'function' ?
                await rawPage()
                :
                rawPage
        )
            .clone();

        if (this.#pages.length > 1) {
            const pagination = NBT.list(
                NBT.string([
                    text(''),
                    text(
                        this.#paginationFormat
                            .replace('%c', String(this.#currentPage))
                            .replace('%m', String(this.#pages.length))
                    )
                ])
            );

            page.setItems(
                [...this.#defaultButtons]
                    .filter(([action]) => (
                        !this.#infinityLoop ?
                            !(
                                (this.#currentPage === 1 && (action === ButtonAction.FIRST || action === ButtonAction.BACK)) ||
                                (this.#currentPage === this.#pages.length && (action === ButtonAction.LAST || action === ButtonAction.NEXT))
                            )
                            :
                            true
                    ))
                    .map(([, buttonItem]) => {
                        buttonItem.nbtData.value.display.value.Lore = pagination;

                        return buttonItem;
                    })
            );
        }

        page.items = page.items.slice(0, this.#inventorySlots);

        page.setItems(new Array(36) // 36 = player inventory slots without armor & etc.
            .fill(null)
            .map((_, index) => new Item({
                id: minecraftData.findItemOrBlockByName('black_stained_glass_pane').id,
                position: this.#inventorySlots + index as IItemConstructor['position'],
                nbt: NBT.compound({
                    display: NBT.compound({
                        Name: NBT.string(
                            text('')
                        )
                    })
                })
            })));

        return page;
    }

    executeAction(action: ButtonAction): void {
        switch (action) {
            case 'first':
                if (this.#currentPage === 1) {
                    if (this.#infinityLoop) {
                        this.setPage(this.#pages.length);
                    }

                    return;
                }

                this.setPage(1);

                break;
            case 'back':
                if (this.#currentPage === 1) {
                    if (this.#infinityLoop) {
                        this.setPage(this.#pages.length);
                    }

                    return;
                }

                this.setPage(this.#currentPage - 1);

                break;
            case 'stop':
                this.stop();
                break;
            case 'next':
                if (this.#currentPage === this.#pages.length) {
                    if (this.#infinityLoop) {
                        this.setPage(1);
                    }

                    return;
                }

                this.setPage(this.#currentPage + 1);

                break;
            case 'last':
                if (this.#currentPage === this.#pages.length) {
                    if (this.#infinityLoop) {
                        this.setPage(1);
                    }

                    return;
                }

                this.setPage(this.#pages.length);

                break;
        }
    }

    stop(): void {
        this.#stopped = true;
        this.#built = false;

        this.proxy.client.write('close_window', {
            windowId: this.#windowId
        });

        this.proxy.packetManager.packetSwindler({
            meta: {
                name: 'close_window',
                state: this.proxy.client.state
            },
            packet: {
                windowId: this.#windowId
            },
            isFromServer: false,
            send: () => null
        });
    }

    async build(): Promise<void> {
        if (!this.#pages.length) {
            throw new Error('Pages not set.');
        }

        if (!this.#built) {
            this.#built = true;

            if (this.#stopped) {
                this.#stopped = false;
            }

            this.proxy.client.context.openWindow({
                windowId: this.#windowId,
                inventoryType: this.#inventoryType,
                ...await this.getPage()
            });

            const setSlotListener = (context: PacketContext) => {
                context.setCanceled(true);
            };

            const windowClickListener = async (context: PacketContext) => {
                const { packet: { slot } } = context;

                this.proxy.client.context.dropItem();
                this.rerender();

                if (slot <= this.#inventorySlots - 1) {
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

            const autoRerenderInterval = this.#autoRerenderInterval ?
                setInterval(() => {
                    if (this.proxy.client.ended && autoRerenderInterval) {
                        clearInterval(autoRerenderInterval);
                    }

                    this.rerender();
                }, this.#autoRerenderInterval)
                :
                null;

            this.proxy.packetManager.once(['close_window', 'respawn'], (context) => {
                context.setCanceled(true);

                this.#stopped = true;
                this.#built = false;

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
                    cursorItem: new Item({
                        id: 1,
                        position: 1,
                        nbt: NBT.compound({
                            display: NBT.compound({
                                Name: NBT.string(
                                    text('SteveProxy Restore Inventory')
                                )
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
        if (this.#stopped) {
            return;
        }

        const { items } = await this.getPage();

        this.proxy.client.context.sendWindowItems({
            windowId: this.#windowId,
            items
        });
    }
}

export * from './types';
export * from './gui';
export * from './components';
