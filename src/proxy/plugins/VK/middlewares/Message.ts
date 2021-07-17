import { MessageContext } from "vk-io";
import { ClickAction, Component, HoverAction, keybind, text, translate } from "rawjsonbuilder";

import { PluginManager } from "../../../modules";
import { Middleware } from "./Middleware";
import { Markdown } from "../Markdown";

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

        const { name, chat_settings: { title = "" } = {}, push_settings, unread_count = 0 } = await this.vk.getByMultipleId(context);

        if (push_settings?.disabled_forever || push_settings?.no_sound) {
            return next();
        }

        await context.loadMessagePayload();

        const builder = text(Component.SEPARATOR)
            .addExtra(this.meta.prefix)
            .addSpace();

        if (title) {
            builder.addExtra(
                translate("[%s]", [
                    text(title, "gray")
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: `${LINK_PREFIX}im?sel=${context.peerId}`
                        })
                        .setHoverEvent({
                            action: HoverAction.SHOW_TEXT,
                            value: text("Нажмите, чтобы открыть беседу.", "gray")
                        })
                ])
            )
                .addSpace();
        }

        builder.addExtra(
            text(name)
                .setInsertion(`${PluginManager.prefix}${this.meta.name} send ${context.peerId}`)
                .setClickEvent({
                    action: ClickAction.OPEN_URL,
                    value: `${LINK_PREFIX}${context.isUser ? "id" : "club"}${Math.abs(context.senderId)}`
                })
                .setHoverEvent({
                    action: HoverAction.SHOW_TEXT,
                    value: text("")
                        .addExtra(
                            translate("§7Нажмите, чтобы открыть %s§7.", [
                                context.isUser ?
                                    "профиль"
                                    :
                                    "сообщество"
                            ])
                        )
                        .addNewLine()
                        .addNewLine()
                        .addExtra(
                            translate("§7Непрочитанных сообщений: %s§7.", [
                                String(unread_count)
                            ])
                        )
                        .addNewLine()
                        .addNewLine()
                        .addExtra(
                            translate("§7Нажмите с использованием %s§7, чтобы отправить сообщение.", [
                                keybind("key.sneak")
                            ])
                        )
                })
        );

        builder.addExtra(
            text(":")
        )
            .addNewLine()
            .addNewLine();

        builder.addExtra(
            Markdown.convertTextToRawJson(context.text)
        );

        if (context.hasForwards) {
            builder.addNewLine()
                .addExtra(
                    text("§7§oПересланное сообщение§r")
                );
        }

        if (context.attachments.length) {
            builder
                .addNewLine()
                .addExtra(
                    text("§l§nВложения§r:")
                )
                .addNewLine()
                .addNewLine()
                .addExtra(
                    Markdown.parseAttachments(context.attachments)
                )
                .addNewLine();
        }

        this.proxy.client.context.send(builder);

        next();
    }
}
