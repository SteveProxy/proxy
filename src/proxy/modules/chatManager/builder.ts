import chunk from 'chunk';
import { ClickAction, Component, ComponentsUnion, text, TextComponent, translate } from 'rawjsonbuilder';

import { Proxy } from '../../';
import { ChatManager, buildersStorage } from './';

import { generateRandomString } from '../../../utils';

import { AutoGeneratePagesOptions, Button, ButtonUnion, ITrigger, Page } from './types';

export class ChatBuilder {

    readonly proxy: Proxy;

    readonly id = generateRandomString(6);

    #pages: Page[] = [];
    #header: ComponentsUnion = new TextComponent();
    #footer: ComponentsUnion = new TextComponent();
    #currentPage = 1;
    #infinityLoop = true;
    #autoResetTimeout = true;
    #paginationFormat = '%c §7/§r %m';
    #defaultButtons = new Map<string, string>();

    #listenTime = 5 * 60 * 1_000;
    #listenTimeout?: NodeJS.Timeout;

    #triggers = new Map<ITrigger['name'], ITrigger['callback']>();

    constructor(proxy: Proxy) {
        this.proxy = proxy;

        this.setDefaultButtons();
    }

    setPages(pages: Page | Page[]): this {
        this.#pages = Array.isArray(pages) ? pages : [pages];

        return this;
    }

    addPages(pages: Page | Page[]): this {
        this.#pages = this.#pages.concat(pages);

        return this;
    }

    autoGeneratePages(options: AutoGeneratePagesOptions): this {
        if (Array.isArray(options)) {
            options = {
                items: options
            };
        }

        const { items, chunkSize = 10 } = options;

        const chunks = chunk(items, chunkSize);

        this.setPages(
            chunks.map((chunk) => new TextComponent()
                .addExtra(
                    chunk.map((item, index) => {
                        const component = text('')
                            .addExtra(item);

                        if (index + 1 < chunk.length) {
                            component.addExtra(Component.SEPARATOR);
                        }

                        return component;
                    })
                ))
        );

        return this;
    }

    async setPage(pageNumber: number): Promise<void> {
        this.#currentPage = pageNumber;

        if (this.#autoResetTimeout) {
            this.resetListenTimeout();
        }

        this.#saveContext();

        this.proxy.client.context.send(
            await this.getPage(pageNumber)
        );
    }

    setAutoResetTimeout(value: boolean): this {
        this.#autoResetTimeout = value;

        this.#saveContext();

        return this;
    }

    setPaginationFormat(format: string): this {
        this.#paginationFormat = format;

        this.#saveContext();

        return this;
    }

    setInfinityLoop(value: boolean): this {
        this.#infinityLoop = value;

        this.#saveContext();

        return this;
    }

    setPagesHeader(header: ComponentsUnion | string): this {
        if (typeof header === 'string') {
            header = text(header);
        }

        this.#header = header;

        this.#saveContext();

        return this;
    }

    setPagesFooter(footer: ComponentsUnion | string): this {
        if (typeof footer === 'string') {
            footer = text(footer);
        }

        this.#footer = footer;

        this.#saveContext();

        return this;
    }

    setDefaultButtons(buttons: ButtonUnion[] = [Button.FIRST, Button.BACK, Button.NEXT, Button.LAST]): this {
        const defaultButtons = new Map<Button, string>([
            [Button.FIRST, '⏪'],
            [Button.BACK, '◀'],
            [Button.STOP, '⏹'],
            [Button.NEXT, '▶'],
            [Button.LAST, '⏩']
        ]);

        this.#defaultButtons = new Map(
            buttons.reduce((buttons: [string, Button][], button) => {
                switch (typeof button) {
                    case 'string': {
                        const buttonLabel = defaultButtons.get(button);

                        if (buttonLabel) {
                            buttons.push([buttonLabel, button]);
                        }
                        break;
                    }
                    case 'object': {
                        const [[buttonAction, buttonLabel]] = Object.entries(button) as [Button, string][];

                        if (defaultButtons.has(buttonAction)) {
                            buttons.push([buttonLabel, buttonAction]);
                        }
                        break;
                    }
                }

                return buttons;
            }, [])
        );

        this.#saveContext();

        return this;
    }

    resetListenTimeout(isFirstBuild = false): void {
        if (this.#listenTimeout || isFirstBuild) {
            clearTimeout(this.#listenTimeout!);

            this.#listenTimeout = setTimeout(this.stopListen.bind(this), this.#listenTime);

            this.#saveContext();
        }
    }

    stopListen(): void {
        if (this.#listenTimeout) {
            clearTimeout(this.#listenTimeout);

            buildersStorage.delete(this.id);
        }
    }

    async getPage(pageNumber: number = this.#currentPage): Promise<TextComponent> {
        let page = this.#pages[pageNumber - 1];

        if (typeof page === 'function') {
            page = await page();
        }

        if (typeof page === 'string') {
            page = text(page);
        }

        if (this.#header.toRawString().length) {
            page = new TextComponent()
                .addExtra(this.#header)
                .addNewLine()
                .addNewLine()
                .addExtra(page);
        }

        page = new TextComponent(page as TextComponent);

        const footerLength = this.#footer.toRawString().length;
        const defaultButtonsSize = this.#defaultButtons.size;

        if (footerLength || defaultButtonsSize) {
            page.addNewLine()
                .addNewLine();

            const defaultButtons = [...this.#defaultButtons]
                .filter(([, buttonAction]) => (
                    !this.#infinityLoop ?
                        !(
                            (this.#currentPage === 1 && (buttonAction === 'first' || buttonAction === 'back')) ||
                            (this.#currentPage === this.#pages.length && (buttonAction === 'last' || buttonAction === 'next'))
                        )
                        :
                        true
                ))
                .map(([buttonLabel, buttonAction], index) => (
                    translate(`%s${index + 1 < defaultButtonsSize ? ' §7|§r ' : ' '}`, [
                        text(buttonLabel)
                            .setClickEvent({
                                action: ClickAction.RUN_COMMAND,
                                value: `${ChatManager.prefix} ${this.id} ${buttonAction}`
                            })
                    ])
                ));

            if (this.#pages.length > 1) {
                page.addExtra(defaultButtons);
            }

            const pagination = this.#paginationFormat
                .replace('%c', String(this.#currentPage))
                .replace('%m', String(this.#pages.length));

            page.addExtra(`${pagination}§r`);

            if ((defaultButtons.length && this.#pages.length > 1 && footerLength) || (!defaultButtons.length && this.#paginationFormat)) {
                page.addSpace()
                    .addExtra(Component.BULLET)
                    .addSpace();
            }

            if (footerLength) {
                page.addExtra(this.#footer);
            }
        }

        return text('')
            .addNewLine()
            .addExtra(page)
            .addNewLine();
    }

    setTriggers(triggers: ITrigger | ITrigger[]): this {
        if (!Array.isArray(triggers)) {
            triggers = [triggers];
        }

        this.#triggers = new Map(
            triggers.map(({ name, callback }) => [name, callback])
        );

        this.#saveContext();

        return this;
    }

    addTriggers(triggers: ITrigger | ITrigger[]): this {
        if (!Array.isArray(triggers)) {
            triggers = [triggers];
        }

        triggers.forEach(({ name, callback }) => this.#triggers.set(name, callback));

        this.#saveContext();

        return this;
    }

    executeAction(action: Button | ITrigger['name']): void {
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
                this.stopListen();
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
            default: {
                const trigger = this.#triggers.get(action);

                if (trigger) {
                    trigger();
                }

                break;
            }
        }
    }

    get triggerCommandPrefix(): string {
        return `${ChatManager.prefix} ${this.id}`;
    }

    build(): void {
        if (!this.#pages.length) {
            throw new Error('Pages not set');
        }

        this.setPage(this.#currentPage);

        this.resetListenTimeout(true);
    }

    #saveContext(): void {
        buildersStorage.set(this.id, this);
    }
}
