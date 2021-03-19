import axios from "axios";
import minecraftPath from "minecraft-path";
import { RawJSONBuilder } from "rawjsonbuilder";

import { minecraftData, TEXTURES_ENDPOINT } from "../../utils";

import { Plugin } from "./Plugin";
import { Proxy } from "../Proxy";

import { ISkin, IChangeSkinOptions } from "../../interfaces/proxy/plugins/Skin";
import { NBT } from "../modules/pagesBuilder/components/NBT";
import { PacketContext } from "../modules/packetManager/PacketContext";

const MINECRAFT_API_ENDPOINT = "https://api.minecraftservices.com/minecraft/profile/skins";
const ASHCON_API_ENDPOINT = "https://api.ashcon.app/mojang/v2";

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
            prefix: "§5§lSkin§r §f|"
        });

        this.meta.commands = [
            {
                name: "",
                handler: this.gui
            },
            {
                name: "steal",
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
        await this.updatePages();

        return this.builder.build();
    }

    private async updatePages(): Promise<void> {
        const skins = (await this.readSkins())
            .reverse();

        this.builder.autoGeneratePages({
            windowTitle: new RawJSONBuilder()
                .setText(`${this.meta.prefix} Библиотека скинов`),
            items: skins.map(({ url, slim, name }) => ({
                id: PLAYER_HEAD,
                onClick: () => this.changeSkin({
                    url,
                    slim
                }),
                nbt: new NBT("compound", {
                    display: new NBT("compound", {
                        Name: new NBT("string", new RawJSONBuilder()
                            .setText({
                                text: name || "Без названия",
                                color: "white",
                                italic: false
                            })),
                        Lore: new NBT("list", new NBT("string", [
                            new RawJSONBuilder()
                                .setText(""),
                            new RawJSONBuilder()
                                .setText(
                                    this.isSelected(url) ?
                                        "§5Выбран"
                                        :
                                        "§7Нажмите, для того чтобы установить скин."
                                )
                        ]))
                    }),
                    SkullOwner: new NBT("compound", {
                        Name: new NBT("string", this.proxy.client.username),
                        Properties: new NBT("compound", {
                            textures: new NBT("list", new NBT("compound", [{
                                Value: new NBT("string", Buffer.from(
                                    JSON.stringify({
                                        textures: {
                                            SKIN: {
                                                url
                                            }
                                        }
                                    })
                                )
                                    .toString("base64"))
                            }]))
                        })
                    })
                })
            }))
        })
            .setDefaultButtons({
                back: {
                    position: 45
                },
                next: {
                    position: 53
                }
            });
    }

    private steal(nickname: string): void {
        this.proxy.client.context.send(`${this.meta.prefix} Загрузка информации об игроке ${nickname}...`);

        axios.get(`${ASHCON_API_ENDPOINT}/user/${nickname}`)
            .then(({ data: { textures: { skin: { url }, slim } } }) => {
                this.changeSkin({
                    url,
                    slim
                });
            })
            .catch((error) => {
                switch (error?.response?.status) {
                    case 404:
                        this.proxy.client.context.send(`${this.meta.prefix} §cИгрока с никнеймом §f${nickname} §cне существует!`);

                        break;
                    case 429:
                        this.proxy.client.context.send(`${this.meta.prefix} §cИнформация об игроке недоступна! Попробуйте позже.`);

                        break;
                    case 500:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка на сервере с информацией! Попробуйте позже.`);

                        break;
                }
            });
    }

    private isSelected(url: string) {
        return url === this.currentSkin;
    }

    private changeSkin({ url, slim }: IChangeSkinOptions): void {
        if (this.cooldown < Date.now()) {
            if (url !== this.currentSkin) {
                this.updateCooldown();

                this.proxy.client.context.send(`${this.meta.prefix} Установка скина...`);

                axios.post(MINECRAFT_API_ENDPOINT, {
                    url,
                    variant: slim ? "slim" : "classic"
                }, {
                    headers: {
                        Authorization: `Bearer ${this.proxy.bridge.session.accessToken}`
                    }
                })
                    .then(async () => {
                        this.currentSkin = url;

                        await this.updatePages();
                        this.builder.rerender();

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