import { Proxy } from "../../Proxy";
import { Plugin } from "../Plugin";

import _dictionary from "./dictionary.json";

import { randomInteger } from "../../../utils";

import { IDictionary } from "../../../interfaces";

const dictionary: IDictionary = _dictionary;

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
}