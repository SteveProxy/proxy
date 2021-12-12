import axios from 'axios';

import { ASHCON_API_ENDPOINT, isValidNickname } from '../../../utils';

import { Plugin } from '../../plugins';

import { IPlayer } from './types';

export class API {

    readonly plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    getPlayer(nickname: string): Promise<IPlayer> {
        const plugin = this.plugin;

        return new Promise((resolve) => {
            if (!isValidNickname(nickname)) {
                return plugin.proxy.client.context.send(
                    `${plugin.meta.prefix} §cНикнейм может содержать символы латиницы, цифры и символ "_", а также не должен быть длиннее 16 символов.`
                );
            }

            plugin.proxy.client.context.send(
                `${plugin.meta.prefix} Загрузка информации об игроке §l${nickname}§r...`
            );

            axios.get(`${ASHCON_API_ENDPOINT}/user/${nickname}`)
                .then(({ data }) => resolve(data))
                .catch((error) => {
                    switch (error?.response?.status) {
                        case 404:
                            return plugin.proxy.client.context.send(
                                `${plugin.meta.prefix} §cИгрока с никнеймом §f${nickname} §cне существует!`
                            );
                        case 429:
                            return plugin.proxy.client.context.send(
                                `${plugin.meta.prefix} §cИнформация об игроке недоступна! Попробуйте позже.`
                            );
                        case 500:
                            return plugin.proxy.client.context.send(
                                `${plugin.meta.prefix} §cПроизошла ошибка на сервере с информацией! Попробуйте позже.`
                            );
                        default:
                            return plugin.proxy.client.context.send(
                                `${plugin.meta.prefix} §cПроизошла ошибка при загрузке информации! Попробуйте позже.`
                            );
                    }
                });
        });
    }
}

export * from './types';
