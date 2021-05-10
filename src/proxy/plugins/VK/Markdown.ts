import moment from "moment";
import { RawJSONBuilder, ClickAction, Color } from "rawjsonbuilder";
import { Attachment, AttachmentType, AudioMessageAttachment, ExternalAttachment, LinkAttachment } from "vk-io";

import { LINK_PREFIX } from "./constants";

import { normalizeDuration } from "../../../utils";
import { separator } from "../../modules/chatManager/components";

import { NotificationsNotificationItem } from "vk-io/lib/api/schemas/objects";

import "moment/locale/ru";

const { AUDIO, AUDIO_MESSAGE, DOCUMENT, GIFT, GRAFFITI, LINK, PHOTO, POLL, STICKER, STORY, VIDEO, WALL, WALL_REPLY } = AttachmentType;

moment.locale("ru");

export class Markdown {

    static notificationFields = ["header", "text", "footer"];

    static convertTextToRawJson(text = "", params = {}): RawJSONBuilder {
        const links: [string, string, boolean][] = [];

        text = text.replace(/(?:''')?\[([^[]+?)\|([^]+?)](?:''')?/g, (match, link, text) => {
            if (!link.startsWith(LINK_PREFIX)) {
                link = `${LINK_PREFIX}${link}`;
            }

            links.push([link, text, match.startsWith("'")]);

            return "%s";
        })
            .replaceAll(/'''(.+?)'''/g, "§l$1");

        if (links.length) {
            return new RawJSONBuilder()
                .setTranslate({
                    translate: text,
                    with: links.map(([link, text, bold]) => new RawJSONBuilder()
                        .setText({
                            text,
                            bold,
                            color: "#3f8ae0",
                            underlined: true,
                            clickEvent: {
                                action: "open_url",
                                value: link
                            }
                        })),
                    ...params
                });
        }

        return new RawJSONBuilder()
            .setText({
                text,
                ...params
            });
    }

    static parseAttachments(attachments: (Attachment | ExternalAttachment)[]): RawJSONBuilder {
        const parsedAttachments = (
            // eslint-disable-next-line array-callback-return
            attachments.map((attachment) => {
                switch (attachment.type) {
                    case AUDIO_MESSAGE: {
                        const { url = "", duration = 0 } = attachment as AudioMessageAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: `⏵ Голосовое сообщение (§7${normalizeDuration(duration * 1000)}§r)`,
                                clickEvent: {
                                    action: "open_url",
                                    value: url
                                }
                            });
                    }
                    case AUDIO: {
                        return new RawJSONBuilder()
                            .setText({
                                text: "♫ Аудиозапись",
                                clickEvent: {
                                    action: "open_url",
                                    value: `${LINK_PREFIX}/${String(attachment)}`
                                }
                            });
                    }
                    case DOCUMENT: {
                        return new RawJSONBuilder()
                            .setText("✂ Документ");
                    }
                    case GIFT: {
                        return new RawJSONBuilder()
                            .setText("☆ Подарок");
                    }
                    case GRAFFITI: {
                        return new RawJSONBuilder()
                            .setText("✎ Граффити");
                    }
                    case LINK: {
                        const { description, button, title, url } = attachment as LinkAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: `● ${description || button?.title || "Ссылка"}: ${title}`,
                                clickEvent: {
                                    action: ClickAction.OPEN_URL,
                                    value: url
                                }
                            });
                    }
                    case PHOTO: {
                        return new RawJSONBuilder()
                            .setText("● Фотография");
                    }
                    case POLL: {
                        return new RawJSONBuilder()
                            .setText("● Опрос");
                    }
                    case STICKER: {
                        return new RawJSONBuilder()
                            .setText("● Стикер");
                    }
                    case STORY: {
                        return new RawJSONBuilder()
                            .setText("● История");
                    }
                    case VIDEO: {
                        return new RawJSONBuilder()
                            .setText("● Видео");
                    }
                    case WALL: {
                        return new RawJSONBuilder()
                            .setText("● Запись");
                    }
                    case WALL_REPLY: {
                        return new RawJSONBuilder()
                            .setText("● Комментарий");
                    }
                }
            }) as unknown as RawJSONBuilder[]
        )
            .map((attachment) => attachment.addExtra(
                separator
            ));

        return new RawJSONBuilder()
            .setExtra(parsedAttachments);
    }

    static parseNotification(notification: NotificationsNotificationItem): RawJSONBuilder {
        Markdown.fillNotification(notification);

        const builder = new RawJSONBuilder();

        Markdown.notificationFields.forEach((key) => {
            const field = notification[key];

            const params = {
                ...(
                    key === "footer" ?
                        {
                            color: Color.GRAY
                        }
                        :
                        {}
                )
            };

            if (field) {
                builder.addExtra([
                    Markdown.convertTextToRawJson(field, params),
                    separator,
                    separator
                ]);
            }
        });

        return builder;
    }

    static fillNotification(notification: NotificationsNotificationItem): void {
        const { date } = notification;

        Markdown.notificationFields.forEach((key) => {
            if (notification[key]) {
                notification[key] = notification[key].replace("{date}", moment(date as number * 1000).fromNow());
            }
        });
    }
}

