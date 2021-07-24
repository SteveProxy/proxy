import { stripIndent } from 'common-tags';
import { BaseComponent, ComponentsUnion, text } from 'rawjsonbuilder';

import { PagesBuilder } from './pagesBuilder/PagesBuilder';
import { ChatBuilder } from './chatManager/ChatBuilder';

import { getVersion } from '../../utils';

import { SendTitleOptions, ISendTabOptions, IOpenWindowOptions, ISetCooldownOptions, SetCooldownOptions, IContext, SendOptions } from '../../interfaces';
import { QuestionBuilder } from './QuestionBuilder';

export class Context {

    client: IContext['client'];
    proxy: IContext['proxy'];
    type: IContext['type'];

    constructor({ client, proxy, type }: IContext) {
        this.client = client;
        this.proxy = proxy;
        this.type = type;
    }

    end(reason: string | ComponentsUnion): void {
        if (typeof reason !== 'string') {
            reason = reason.toRawString();
        }

        this.client.end(stripIndent`
        ${this.proxy.config.bridge.title}
        
        ${reason}
        `);
    }

    send(options: SendOptions): void {
        if (typeof options === 'object') {
            if (options instanceof BaseComponent) {
                options = {
                    message: options
                };
            }

            const { message, useRawJSON = true, position = 0, sender = '0' } = options;

            return this.client.write('chat', {
                message: useRawJSON ?
                    (
                        message instanceof BaseComponent ?
                            message
                            :
                            text(message)
                    )
                        .toString()
                    :
                    message,
                position,
                sender
            });
        }

        this.client.write('chat', {
            message: this.type === 'bridge' ?
                options
                :
                text(options).toString(),
            position: 0,
            sender: '0'
        });
    }

    sendTitle(options: SendTitleOptions): void {
        if (typeof options === 'string') {
            options = {
                title: options
            };
        }

        const { title, subtitle, actionbar, fadeIn, fadeOut, stay, hide, reset } = options;

        if (subtitle) {
            this.client.write('set_title_subtitle', {
                text: text('')
                    .addExtra(
                        subtitle
                    )
                    .toString()
            });
        }

        if (title) {
            this.client.write('set_title_text', {
                text: text('')
                    .addExtra(title)
                    .toString()
            });
        }

        if (actionbar) {
            this.client.write('action_bar', {
                text: text('')
                    .addExtra(actionbar)
                    .toString()
            });
        }

        if (fadeIn !== undefined || fadeOut !== undefined || stay !== undefined) {
            this.client.write('set_title_time', {
                fadeIn,
                stay,
                fadeOut
            });
        }

        if (hide) {
            this.client.write('clear_titles', {
                reset: false
            });
        }

        if (reset) {
            this.client.write('clear_titles', {
                reset: true
            });
        }
    }

    sendTab({ header = text(''), footer = text('') }: ISendTabOptions): void {
        this.client.write('playerlist_header', {
            header: header instanceof BaseComponent ?
                header.toString()
                :
                JSON.stringify(header),
            footer: footer instanceof BaseComponent ?
                footer.toString()
                :
                JSON.stringify(footer)
        });
    }

    sendBrand(brand: string | ComponentsUnion): void {
        if (typeof brand !== 'string') {
            brand = brand.toRawString();
        }

        this.client.writeChannel(this.client.protocolVersion >= getVersion('1.13-pre3') ? 'brand' : 'MC|Brand', brand);
    }

    sendBossBar(): void {
        // todo
    }

    openWindow({ windowTitle = text(''), inventoryType = 2, windowId, items }: IOpenWindowOptions): void {
        this.client.write('open_window', {
            windowId,
            inventoryType,
            windowTitle: windowTitle.toString()
        });

        if (items) {
            this.client.write('window_items', {
                windowId,
                items
            });
        }
    }

    dropItem(): void {
        this.client.write('set_slot', {
            windowId: -1,
            slot: -1,
            item: {
                present: false
            }
        });
    }

    setCooldown(options: SetCooldownOptions): void {
        if (typeof options !== 'object') {
            options = {
                id: options
            };
        }

        let { id, cooldown = 1 } = options as ISetCooldownOptions;

        if (!Array.isArray(id)) {
            id = [id];
        }

        id.forEach((id) => {
            this.client.write('set_cooldown', {
                itemID: id,
                cooldownTicks: cooldown * 20
            });
        });
    }

    pagesBuilder(): PagesBuilder {
        return new PagesBuilder(this.proxy);
    }

    chatBuilder(): ChatBuilder {
        return new ChatBuilder(this.proxy);
    }

    questionBuilder(): QuestionBuilder {
        return new QuestionBuilder(this.proxy);
    }
}
