import { Proxy } from "../../Proxy";
import { Plugin } from "../Plugin";

import _dictionary from "./dictionary.json";
import emoji from "./emoji.json";

import { randomInteger } from "../../../utils";

import { EmojiCategoriesMap, IDictionary } from "../../../interfaces";
import { RawJSONBuilder } from "rawjsonbuilder";

const dictionary: IDictionary = _dictionary;

const categories: EmojiCategoriesMap = new Map([
    ["emotions", "Эмоции"],
    ["actions", "Действия"],
    ["animals", "Животные"]
]);

export class Chat extends Plugin {

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "chat",
            description: "Помощник чата",
            prefix: "§b§lChat"
        });

        this.meta.commands = [
            {
                name: "",
                description: "Ретрансляция переданного сообщения",
                handler: this.retranslateMessage,
                args: [
                    "Сообщение"
                ]
            },
            {
                name: "emoji",
                description: "Список доступных Emoji",
                ignorePluginPrefix: true,
                handler: this.emojiList
            }
        ];
    }

    retranslateMessage(message: string): void {
        const chars = message.toLowerCase()
            .split("");

        this.proxy.bridge.context.send(
            chars.map((char) => {
                const charsFromDictionary = dictionary[char];

                return charsFromDictionary ?
                    charsFromDictionary[randomInteger(0, charsFromDictionary.length - 1)]
                    :
                    char;
            })
                .join("")
        );
    }

    emojiList(): void {
        this.proxy.client.context.chatBuilder()
            .setPagesHeader(`${this.meta.prefix} Список доступных Emoji`)
            .setPages(
                [...categories].map(([category, description]) => {
                    const categoryEmoji = emoji[category];

                    return new RawJSONBuilder()
                        .setExtra([
                            new RawJSONBuilder()
                                .setText(description),
                            new RawJSONBuilder()
                                .setText("\n\n"),
                            ...categoryEmoji.map((emoji, index) => new RawJSONBuilder()
                                .setExtra([
                                    new RawJSONBuilder()
                                        .setText({
                                            text: emoji,
                                            bold: true,
                                            insertion: emoji,
                                            hoverEvent: {
                                                action: "show_text",
                                                contents: new RawJSONBuilder()
                                                    .setTranslate({
                                                        translate: "§7Нажмите с использованием %s§7, чтобы вставить Emoji в чат.",
                                                        with: [
                                                            new RawJSONBuilder()
                                                                .setKeybind("key.sneak")
                                                        ]
                                                    })
                                            }
                                        }),
                                    new RawJSONBuilder()
                                        .setText("    §7|§r    "),
                                    ...(
                                        (index + 1) % 2 === 0 ?
                                            [
                                                new RawJSONBuilder()
                                                    .setText("\n")
                                            ]
                                            :
                                            []

                                    )
                                ]))
                        ]);
                })
            )
            .build();
    }
}
