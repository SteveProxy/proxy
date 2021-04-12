import chunk from "chunk";
import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../../Proxy";

import { buildersStorage, bullet, ChatManager, separator } from "./ChatManager";

import { generateID } from "../../../utils";

import { AutoGeneratePagesOptions, Button, DefaultButtonLabel, DefaultTextButtonsMap, IResetListenTimeoutOptions, ITrigger, Page, StringButton, TriggersMap } from "../../../interfaces";

export class ChatBuilder {

    readonly proxy: Proxy;

    readonly id: string = generateID(6);

    private pages: Page[] = [];
    private header = new RawJSONBuilder();
    private footer = new RawJSONBuilder();
    private currentPage = 1;
    private infinityLoop = true;
    private autoResetTimeout = true;
    private paginationFormat = "%c §7/§r %m";
    private defaultButtons: Map<DefaultButtonLabel, string> = new Map();

    private listenTime = 5 * 60 * 1000;

    private triggers: TriggersMap = new Map();

    private listenTimeout?: NodeJS.Timeout;

    constructor(proxy: Proxy) {
        this.proxy = proxy;

        this.setDefaultButtons();
    }

    setPages(pages: Page | Page[]): this {
        this.pages = Array.isArray(pages) ? pages : [pages];

        return this;
    }

    addPages(pages: Page | Page[]): this {
        this.pages = this.pages.concat(pages);

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
            chunks.map((chunk) => new RawJSONBuilder()
                .setExtra(
                    chunk.map((item, index) => new RawJSONBuilder().setExtra([
                        item,
                        ...(
                            index + 1 < chunk.length ?
                                [
                                    new RawJSONBuilder()
                                        .setText("\n")
                                ]
                                :
                                []
                        )
                    ]))
                ))
        );

        return this;
    }

    async setPage(pageNumber: number): Promise<void> {
        this.currentPage = pageNumber;

        if (this.autoResetTimeout) {
            this.resetListenTimeout();
        }

        this.saveContext();

        this.proxy.client.context.send(
            await this.getPage(pageNumber)
        );
    }

    setAutoResetTimeout(value: boolean): this {
        this.autoResetTimeout = value;

        this.saveContext();

        return this;
    }

    setPaginationFormat(format: string): this {
        this.paginationFormat = format;

        this.saveContext();

        return this;
    }

    setInfinityLoop(value: boolean): this {
        this.infinityLoop = value;

        this.saveContext();

        return this;
    }

    setPagesHeader(header: RawJSONBuilder | string): this {
        if (typeof header === "string") {
            header = new RawJSONBuilder()
                .setText(header);
        }

        this.header = header;

        this.saveContext();

        return this;
    }

    setPagesFooter(footer: RawJSONBuilder | string): this {
        if (typeof footer === "string") {
            footer = new RawJSONBuilder()
                .setText(footer);
        }

        this.footer = footer;

        this.saveContext();

        return this;
    }

    setDefaultButtons(buttons: Button[] = ["first", "back", "next", "last"]): this {
        const defaultButtons: DefaultTextButtonsMap = new Map([
            ["first", "⏪"],
            ["back", "◀"],
            ["stop", "⏹"],
            ["next", "▶"],
            ["last", "⏩"]
        ]);

        this.defaultButtons = new Map(
            // eslint-disable-next-line array-callback-return
            buttons.map((button) => {
                switch (typeof button) {
                    case "string": {
                        const buttonLabel = defaultButtons.get(button);

                        if (buttonLabel) {
                            return [buttonLabel, button];
                        }
                        break;
                    }
                    case "object": {
                        const [[buttonAction, buttonLabel]] = Object.entries(button);

                        if (defaultButtons.get(buttonAction as StringButton)) {
                            return [buttonLabel, buttonAction];
                        }
                        break;
                    }
                }
            }) as [DefaultButtonLabel, StringButton][]
        );

        this.saveContext();

        return this;
    }

    resetListenTimeout({ isFirstBuild = false }: IResetListenTimeoutOptions = {}): void {
        if (this.listenTimeout || isFirstBuild) {
            clearTimeout(this.listenTimeout as NodeJS.Timeout);

            this.listenTimeout = setTimeout(this.stopListen.bind(this), this.listenTime);

            this.saveContext();
        }
    }

    stopListen(): void {
        if (this.listenTimeout) {
            clearTimeout(this.listenTimeout);

            buildersStorage.delete(this.id);
        }
    }

    async getPage(pageNumber: number = this.currentPage): Promise<RawJSONBuilder> {
        let page = this.pages[pageNumber - 1];

        if (typeof page === "function") {
            page = await page();
        }

        if (typeof page === "string") {
            page = new RawJSONBuilder()
                .setExtra(
                    new RawJSONBuilder()
                        .setText(page)
                );
        }

        if (Object.keys(this.header.message).length) {
            page = new RawJSONBuilder()
                .setExtra([
                    this.header,
                    separator,
                    separator,
                    page
                ]);
        }

        page = new RawJSONBuilder(page);

        const footerLength = Object.keys(this.footer.message).length;
        const defaultButtonsSize = this.defaultButtons.size;

        if (footerLength || defaultButtonsSize) {
            page.addExtra([
                separator,
                separator
            ]);

            const defaultButtons = [...this.defaultButtons].filter(([, buttonAction]) => !this.infinityLoop ?
                !(
                    (this.currentPage === 1 && (buttonAction === "first" || buttonAction === "back")) ||
                    (this.currentPage === this.pages.length && (buttonAction === "last" || buttonAction === "next"))
                )
                :
                true)
                .map(([buttonLabel, buttonAction], index) => new RawJSONBuilder()
                    .setText({
                        text: `${buttonLabel}${index + 1 < defaultButtonsSize ? " §7|§r " : " "}`,
                        clickEvent: {
                            action: "run_command",
                            value: `${ChatManager.prefix} ${this.id} ${buttonAction}`
                        }
                    }));

            page.addExtra([
                ...(
                    this.pages.length > 1 ?
                        defaultButtons
                        :
                        []
                ),
                new RawJSONBuilder()
                    .setText(`${
                        this.paginationFormat.replace("%c", String(this.currentPage))
                            .replace("%m", String(this.pages.length))
                    }§r`),
                ...(
                    (defaultButtons.length && this.pages.length > 1 && footerLength) || (!defaultButtons.length && this.paginationFormat) ?
                        [bullet]
                        :
                        []
                )
            ]);

            if (footerLength) {
                page.addExtra(this.footer);
            }
        }

        page = new RawJSONBuilder()
            .setExtra([
                separator,
                page,
                separator
            ]);

        return page;
    }

    setTriggers(triggers: ITrigger | ITrigger[]): this {
        if (!Array.isArray(triggers)) {
            triggers = [triggers];
        }

        this.triggers = new Map(
            triggers.map(({ name, callback }) => [name, callback])
        );

        this.saveContext();

        return this;
    }

    addTriggers(triggers: ITrigger | ITrigger[]): this {
        if (!Array.isArray(triggers)) {
            triggers = [triggers];
        }

        triggers.forEach(({ name, callback }) => this.triggers.set(name, callback));

        this.saveContext();

        return this;
    }

    executeAction(action: StringButton | ITrigger["name"]): void {
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
                this.stopListen();
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
            default: {
                const trigger = this.triggers.get(action);

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
        if (!this.pages.length) {
            throw new Error("Pages not set.");
        }

        this.setPage(this.currentPage);

        this.resetListenTimeout({
            isFirstBuild: true
        });
    }

    private saveContext(): void {
        buildersStorage.set(this.id, this);
    }
}
