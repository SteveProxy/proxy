import axios from "axios";

import { ASHCON_API_ENDPOINT, isValidNickname } from "../../utils";

import { Plugin } from "../plugins/Plugin";

import { IPlayer } from "../../interfaces";

export class API {

    readonly plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    getPlayer(nickname: string): Promise<IPlayer> {
        const plugin = this.plugin;

        return new Promise((resolve) => {
            if (isValidNickname(nickname)) {
                plugin.proxy.client.context.send(
                    `${plugin.meta.prefix} Загрузка информации об игроке ${nickname}...`
                );

                axios.get(`${ASHCON_API_ENDPOINT}/user/${nickname}`)
                    .then(({ data }) => resolve(data))
                    .catch((error) => {
                        switch (error?.response?.status) {
                            case 404:
                                plugin.proxy.client.context.send(
                                    `${plugin.meta.prefix} §cИгрока с никнеймом §f${nickname} §cне существует!`
                                );

                                break;
                            case 429:
                                plugin.proxy.client.context.send(
                                    `${plugin.meta.prefix} §cИнформация об игроке недоступна! Попробуйте позже.`
                                );

                                break;
                            case 500:
                                plugin.proxy.client.context.send(
                                    `${plugin.meta.prefix} §cПроизошла ошибка на сервере с информацией! Попробуйте позже.`
                                );

                                break;
                            default:
                                plugin.proxy.client.context.send(
                                    `${plugin.meta.prefix} §cПроизошла ошибка при загрузке информации! Попробуйте позже.`
                                );

                                break;
                        }
                    });
            } else {
                plugin.proxy.client.context.send(
                    `${plugin.meta.prefix} §cНикнейм может содержать символы латиницы, цифры и символ "_", а также не должен быть длиннее 16 символов.`
                );
            }
        });
    }
}