import moment from 'moment';
import { ClickAction, Color, text as textComponent, TextComponent, translate, TranslateComponent } from 'rawjsonbuilder';
import { Attachment, AttachmentType, AudioAttachment, AudioMessageAttachment, DocumentAttachment, ExternalAttachment, LinkAttachment, PhotoAttachment, PollAttachment, StickerAttachment, StoryAttachment, VideoAttachment } from 'vk-io';

import { LINK_PREFIX } from './constants';

import { normalizeDuration } from '../../../utils';

import { NotificationsNotificationItem } from 'vk-io/lib/api/schemas/objects';

const { AUDIO, AUDIO_MESSAGE, DOCUMENT, GIFT, GRAFFITI, LINK, PHOTO, POLL, STICKER, STORY, VIDEO, WALL, WALL_REPLY } = AttachmentType;

export class Markdown {

    static notificationFields = ['header', 'text', 'footer'];

    static convertTextToRawJson(text = '', params = {}): TranslateComponent | TextComponent {
        const links: [string, string, boolean][] = [];

        text = text.replace(/(?:''')?\[([^[]+?)\|([^]+?)](?:''')?/g, (match, link, text) => {
            if (!link.startsWith(LINK_PREFIX)) {
                link = `${LINK_PREFIX}${link}`;
            }

            links.push([link, text, match.startsWith('\'')]);

            return '%s';
        })
            .replaceAll(/'''(.+?)'''/g, '§l$1');

        if (links.length) {
            return translate(text, links.map(([link, text, bold]) => (
                textComponent(text)
                    .setBold(bold)
                    .setColor('#3f8ae0')
                    .setClickEvent({
                        action: ClickAction.OPEN_URL,
                        value: link
                    })
            )));
        }

        return new TextComponent({
            text,
            ...params
        });
    }

    static parseAttachments(attachments: (Attachment | ExternalAttachment)[]): TextComponent[] {
        return attachments.map((attachment) => {
            switch (attachment.type) {
                case AUDIO_MESSAGE: {
                    const { url = '', duration = 0 } = attachment as AudioMessageAttachment;

                    return textComponent(`⏵ Голосовое сообщение (§7${normalizeDuration(duration * 1000)}§r)`)
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: url
                        });
                }
                case AUDIO: {
                    const { title = '', artist = '', duration = 0 } = attachment as AudioAttachment;

                    return textComponent(`♫ Аудиозапись: ${title} §7-§r ${artist} (§7${normalizeDuration(duration * 1000)}§r)`)
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: `${LINK_PREFIX}/${String(attachment)}`
                        });
                }
                case DOCUMENT: {
                    const { title = '', url = '' } = attachment as DocumentAttachment;

                    return textComponent(`✂ Документ: ${title}`)
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: url
                        });
                }
                case GIFT: {
                    return textComponent('☆ Подарок');
                }
                case GRAFFITI: {
                    return textComponent('✎ Граффити');
                }
                case LINK: {
                    const { description, button, title, url } = attachment as LinkAttachment;

                    return textComponent(`● ${description || button?.title || 'Ссылка'}: ${title}`)
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: url
                        });
                }
                case PHOTO: {
                    const { largeSizeUrl = '', text } = attachment as PhotoAttachment;

                    return textComponent(`● Фотография${text ? `: ${text}` : ''}`)
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: largeSizeUrl as string
                        });
                }
                case POLL: {
                    const { question } = attachment as PollAttachment;

                    return textComponent(`● Опрос: ${question}`);
                }
                case STICKER: {
                    const { images } = attachment as StickerAttachment;

                    return textComponent('● Стикер')
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: images.pop()?.url as string
                        });
                }
                case STORY: {
                    const { photo, video } = attachment as StoryAttachment;

                    return textComponent('● История')
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: (photo ? photo.largeSizeUrl : video?.player) as string
                        });
                }
                case VIDEO: {
                    const { title, duration = 0, player = '', isBroadcast } = attachment as VideoAttachment;

                    return textComponent(`● ${isBroadcast ? 'Трансляция' : 'Видео'}: ${title} (§7${normalizeDuration(duration * 1000)}§r)`)
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: player
                        });
                }
                case WALL: {
                    return textComponent('● Запись')
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: `${LINK_PREFIX}/${String(attachment)}`
                        });
                }
                case WALL_REPLY: {
                    return textComponent('● Комментарий')
                        .setClickEvent({
                            action: 'open_url',
                            value: `${LINK_PREFIX}/${String(attachment)}`
                        });
                }
                default:
                    return textComponent('● Неподдерживаемое вложение');
            }
        })
            .map((attachment) => attachment.addNewLine());
    }

    static parseNotification(notification: NotificationsNotificationItem): TextComponent {
        Markdown.fillNotification(notification);

        const builder = textComponent('');

        Markdown.notificationFields.forEach((key) => {
            const field = notification[key];

            const params = {
                ...(
                    key === 'footer' ?
                        {
                            color: Color.GRAY
                        }
                        :
                        {}
                )
            };

            if (field) {
                builder.addExtra(Markdown.convertTextToRawJson(field, params))
                    .addNewLine()
                    .addNewLine();
            }
        });

        return builder;
    }

    static fillNotification(notification: NotificationsNotificationItem): void {
        const { date } = notification;

        Markdown.notificationFields.forEach((key) => {
            if (notification[key]) {
                notification[key] = notification[key].replace('{date}', moment(date as number * 1000).fromNow());
            }
        });
    }
}

