import moment from "moment";
import { RawJSONBuilder, ClickAction, Color } from "rawjsonbuilder";
import { Attachment, AttachmentType, AudioAttachment, AudioMessageAttachment, DocumentAttachment, ExternalAttachment, LinkAttachment, PhotoAttachment, PollAttachment, StickerAttachment, StoryAttachment, VideoAttachment } from "vk-io";

import { LINK_PREFIX } from "./constants";
import { separator } from "../../modules";

import { normalizeDuration } from "../../../utils";

import { NotificationsNotificationItem } from "vk-io/lib/api/schemas/objects";

const { AUDIO, AUDIO_MESSAGE, DOCUMENT, GIFT, GRAFFITI, LINK, PHOTO, POLL, STICKER, STORY, VIDEO, WALL, WALL_REPLY } = AttachmentType;

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
                        const { title = "", artist = "", duration = 0 } = attachment as AudioAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: `♫ Аудиозапись: ${title} §7-§r ${artist} (§7${normalizeDuration(duration * 1000)}§r)`,
                                clickEvent: {
                                    action: "open_url",
                                    value: `${LINK_PREFIX}/${String(attachment)}`
                                }
                            });
                    }
                    case DOCUMENT: {
                        const { title = "", url = "" } = attachment as DocumentAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: `✂ Документ: ${title}`,
                                clickEvent: {
                                    action: "open_url",
                                    value: url
                                }
                            });
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
                        const { largeSizeUrl = "", text } = attachment as PhotoAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: `● Фотография${text ? `: ${text}` : ""}`,
                                clickEvent: {
                                    action: ClickAction.OPEN_URL,
                                    value: largeSizeUrl as string
                                }
                            });
                    }
                    case POLL: {
                        const { question } = attachment as PollAttachment;

                        return new RawJSONBuilder()
                            .setText(`● Опрос: ${question}`);
                    }
                    case STICKER: {
                        const { images } = attachment as StickerAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: "● Стикер",
                                clickEvent: {
                                    action: ClickAction.OPEN_URL,
                                    value: images.pop()?.url as string
                                }
                            });
                    }
                    case STORY: {
                        const { photo, video } = attachment as StoryAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: "● История",
                                clickEvent: {
                                    action: ClickAction.OPEN_URL,
                                    value: (photo ? photo.largeSizeUrl : video?.player) as string
                                }
                            });
                    }
                    case VIDEO: {
                        const { title, duration = 0, player = "" } = attachment as VideoAttachment;

                        return new RawJSONBuilder()
                            .setText({
                                text: `● Видео: ${title} (§7${normalizeDuration(duration * 1000)}§r)`,
                                clickEvent: {
                                    action: ClickAction.OPEN_URL,
                                    value: player
                                }
                            });
                    }
                    case WALL: {
                        return new RawJSONBuilder()
                            .setText({
                                text: "● Запись",
                                clickEvent: {
                                    action: "open_url",
                                    value: `${LINK_PREFIX}/${String(attachment)}`
                                }
                            });
                    }
                    case WALL_REPLY: {
                        return new RawJSONBuilder()
                            .setText({
                                text: "● Комментарий",
                                clickEvent: {
                                    action: "open_url",
                                    value: `${LINK_PREFIX}/${String(attachment)}`
                                }
                            });
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

