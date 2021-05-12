import { MessageContext } from "vk-io";
import { ClickAction, HoverAction, RawJSONBuilder } from "rawjsonbuilder";

import { PluginManager } from "../../../modules/PluginManager";
import { Middleware } from "./Middleware";
import { Markdown } from "../Markdown";

import { separator, space } from "../../../modules/chatManager/components";

import { IMiddlewareOptions } from "../../../../interfaces";
import { LINK_PREFIX } from "../constants";

export class Message extends Middleware {

    constructor(plugin: Pick<IMiddlewareOptions, "proxy" | "meta" | "vk">) {
        super({
            name: "message_new",
            ...plugin
        });
    }

    async handler(context: MessageContext, next: VoidFunction): Promise<void> {
        if (context.isOutbox) {
            return;
        }

        const { name, title, push_settings, unread_count } = await this.vk.getByMultipleId(context);

        if (push_settings?.disabled_forever || push_settings?.no_sound) {
            return next();
        }

        this.proxy.client.context.send(
            new RawJSONBuilder()
                .setExtra([
                    separator,
                    new RawJSONBuilder()
                        .setExtra([
                            new RawJSONBuilder()
                                .setText(`${this.meta.prefix} `),
                            new RawJSONBuilder()
                                .setExtra(
                                    title ?
                                        [
                                            new RawJSONBuilder()
                                                .setExtra([
                                                    new RawJSONBuilder()
                                                        .setTranslate({
                                                            translate: "[%s]",
                                                            with: [
                                                                new RawJSONBuilder()
                                                                    .setText({
                                                                        text: title,
                                                                        color: "gray",
                                                                        clickEvent: {
                                                                            action: "open_url",
                                                                            value: `${LINK_PREFIX}im?sel=${context.peerId}`
                                                                        },
                                                                        hoverEvent: {
                                                                            action: "show_text",
                                                                            value: new RawJSONBuilder()
                                                                                .setText("§7Нажмите, чтобы открыть беседу.")
                                                                        }
                                                                    })
                                                            ]
                                                        })
                                                ]),
                                            space
                                        ]
                                        :
                                        [
                                            new RawJSONBuilder()
                                                .setText("")
                                        ]
                                ),
                            new RawJSONBuilder()
                                .setText({
                                    text: name,
                                    insertion: `${PluginManager.prefix}${this.meta.name} send ${context.peerId}`,
                                    clickEvent: {
                                        action: ClickAction.OPEN_URL,
                                        value: `${LINK_PREFIX}${context.isUser ? "id" : "club"}${Math.abs(context.senderId)}`
                                    },
                                    hoverEvent: {
                                        action: HoverAction.SHOW_TEXT,
                                        value: new RawJSONBuilder()
                                            .setExtra([
                                                new RawJSONBuilder()
                                                    .setTranslate({
                                                        translate: "§7Нажмите, чтобы открыть %s§7.",
                                                        with: [
                                                            new RawJSONBuilder()
                                                                .setText(
                                                                    context.isUser ?
                                                                        "профиль"
                                                                        :
                                                                        "сообщество"
                                                                )
                                                        ]
                                                    }),
                                                separator,
                                                separator,
                                                new RawJSONBuilder()
                                                    .setTranslate({
                                                        translate: "§7Непрочитанных сообщений: %s§7.",
                                                        with: [
                                                            new RawJSONBuilder()
                                                                .setText(String(unread_count))
                                                        ]
                                                    }),
                                                separator,
                                                separator,
                                                new RawJSONBuilder()
                                                    .setTranslate({
                                                        translate: "§7Нажмите с использованием %s§7, чтобы отправить сообщение.",
                                                        with: [
                                                            new RawJSONBuilder()
                                                                .setKeybind("key.sneak")
                                                        ]
                                                    })
                                            ])
                                    }
                                }),
                            new RawJSONBuilder()
                                .setText(":")
                        ]),
                    separator,
                    separator,
                    Markdown.convertTextToRawJson(context.text),
                    ...(
                        context.attachments.length ?
                            [
                                separator,
                                new RawJSONBuilder()
                                    .setText("§l§nВложения§r:"),
                                separator,
                                separator,
                                Markdown.parseAttachments(context.attachments)
                            ]
                            :
                            []
                    ),
                    separator
                ])
        );

        next();
    }
}
