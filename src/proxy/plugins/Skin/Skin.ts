import axios from "axios";
import minecraftPath from "minecraft-path";
import { RawJSONBuilder } from "rawjsonbuilder";

import { MINECRAFT_API_ENDPOINT, minecraftData, TEXTURES_ENDPOINT } from "../../../utils";

import { Plugin } from "../Plugin";
import { Proxy } from "../../Proxy";
import { API } from "../../modules/API";
import { PacketContext } from "../../modules/packetManager/PacketManager";

import { PlayerHead } from "../../modules/pagesBuilder/gui";

import { ISkin, IChangeSkinOptions } from "../../../interfaces";

const PLAYER_HEAD = minecraftData.findItemOrBlockByName("player_head").id;

export class Skin extends Plugin {

    private cooldown = 0;
    private currentSkin = "";
    private builder = this.proxy.client.context.pagesBuilder()
        .setInventoryType("generic_9x6");

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "skin",
            description: "Менеджер скинов",
            prefix: "§5§lSkin"
        });

        this.meta.commands = [
            {
                name: "",
                description: "Библиотека скинов лаунчера",
                handler: this.gui
            },
            {
                name: "steal",
                description: "Установить скин игрока",
                handler: this.steal,
                args: [
                    "Никнейм игрока"
                ]
            }
        ];
    }

    start(): void {
        const playerInfoHandler = ({ packet: { action, data: [player] } }: PacketContext) => {
            if (action === 0 && player.UUID === this.proxy.bridge.uuid) {
                this.currentSkin = JSON.parse(Buffer.from(player.properties[0].value, "base64").toString())
                    .textures
                    .SKIN
                    .url;

                this.proxy.packetManager.removeListener("player_info", playerInfoHandler);
            }
        };

        this.proxy.packetManager.on("player_info", playerInfoHandler);
    }

    async gui(): Promise<void> {
        const skins = (await this.readSkins())
            .reverse();

        return this.builder.autoGeneratePages({
            windowTitle: new RawJSONBuilder()
                .setText(`${this.meta.prefix} Библиотека скинов`),
            // eslint-disable-next-line new-cap
            items: skins.map(({ url, slim, name }) => PlayerHead({
                url,
                name: new RawJSONBuilder()
                    .setText({
                        text: name || "Без названия",
                        color: "white",
                        italic: false
                    }),
                lore: [
                    new RawJSONBuilder()
                        .setText(""),
                    new RawJSONBuilder()
                        .setText(
                            this.isSelected(url) ?
                                "§5Выбран"
                                :
                                "§7Нажмите, для того чтобы установить скин."
                        )
                ],
                onClick: async () => {
                    await this.changeSkin({
                        url,
                        slim
                    });

                    this.gui();
                }
            }))
        })
            .setDefaultButtons({
                back: {
                    position: 45
                },
                next: {
                    position: 53
                }
            })
            .build();
    }

    private steal(nickname: string): void {
        new API(this)
            .getPlayer(nickname)
            .then(({ textures: { skin: { url }, slim } }) => {
                this.changeSkin({
                    url,
                    slim
                });
            });
    }

    private isSelected(url: string) {
        return url === this.currentSkin;
    }

    private async changeSkin({ url, slim }: IChangeSkinOptions): Promise<void> {
        if (this.cooldown < Date.now()) {
            if (url !== this.currentSkin) {
                this.updateCooldown();

                this.proxy.client.context.send(`${this.meta.prefix} Установка скина...`);

                await axios.post(MINECRAFT_API_ENDPOINT, {
                    url,
                    variant: slim ? "slim" : "classic"
                }, {
                    headers: {
                        Authorization: `Bearer ${this.proxy.bridge.session.accessToken}`
                    }
                })
                    .then(() => {
                        this.currentSkin = url;

                        this.proxy.client.context.send(`${this.meta.prefix} Скин успешно установлен! Перезайдите на сервер, чтобы обновить текущий скин.`);
                    })
                    .catch((error) => {
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при установке скина!`);

                        console.error(error);
                    });
            } else {
                this.proxy.client.context.send(`${this.meta.prefix} §cУ вас уже установлен данный скин!`);
            }
        }
    }

    private updateCooldown(): void {
        const COOLDOWN = 10;

        this.cooldown = Date.now() + COOLDOWN * 1000;

        this.proxy.client.context.setCooldown({
            id: PLAYER_HEAD,
            cooldown: COOLDOWN
        });
    }

    private async readSkins(): Promise<ISkin[]> {
        const skins: Omit<ISkin, "url"> = (await import(`file://${minecraftPath()}/launcher_skins.json`))
            .default;

        return Object.entries(skins)
            .map(([, skin]) => ({
                ...skin as unknown as Omit<ISkin, "url">, // @ts-ignore
                url: `${TEXTURES_ENDPOINT}${skin.textureId}`
            }));
    }
}