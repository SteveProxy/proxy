import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../../Proxy";
import { Plugin } from "../Plugin";
import { API } from "../../modules/API";

import { humanizeDate } from "../../../utils";

export class Names extends Plugin {

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "names",
            description: "Никнеймы игроков",
            prefix: "§9§lNames§r §f|"
        });

        this.meta.commands = [
            {
                name: "",
                description: "История никнейма",
                handler: this.getNicknameHistory,
                args: [
                    "Никнейм игрока"
                ]
            }
        ];
    }

    getNicknameHistory(nickname: string): void {
        new API(this)
            .getPlayer(nickname)
            .then(({ username_history, username }) => {
                this.proxy.client.context.chatBuilder()
                    .setPagesHeader(`${this.meta.prefix} История никнейма ${username}`)
                    .autoGeneratePages(
                        username_history
                            .reverse()
                            .map(({ username, changed_at }) => new RawJSONBuilder()
                                .setText(`${username} §7-§r ${changed_at ? humanizeDate(changed_at) : "Первый"}`))
                    )
                    .build();
            });
    }
}