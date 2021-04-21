import axios, { AxiosInstance } from "axios";
import SpotifyAPI from "spotify-web-api-node";
import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../../Proxy";
import { Plugin } from "../Plugin";
import { Page, Item, NBT, Slider } from "../../modules/pagesBuilder/PagesBuilder";

import { db } from "../../../DB";

import { generateID, minecraftData, normalizeDuration } from "../../../utils";

import { ISpotify } from "../../../interfaces";

const NEXT_SONG_ITEM = minecraftData.findItemOrBlockByName("green_stained_glass").id;
const PREVIOUS_SONG_ITEM = minecraftData.findItemOrBlockByName("red_stained_glass").id;
const SONG_ITEM = minecraftData.findItemOrBlockByName("name_tag").id;

export class Spotify extends Plugin {

    private spotify: SpotifyAPI;
    private client: AxiosInstance;
    private state: ISpotify = this.proxy.config.plugins.spotify;

    private currentPlaying?: any;
    private getCurrentPlayingInterval?: NodeJS.Timeout;
    private actionbarUpdateInterval?: NodeJS.Timeout;
    private cooldown = 0;
    private authStarted = false;

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "spotify",
            description: "Spotify интеграция",
            prefix: "§2§lSpotify"
        });

        this.meta.commands = [
            {
                name: "",
                description: "Графический интерфейс",
                handler: this.gui
            },
            {
                name: "auth",
                description: "Авторизация в плагине",
                handler: this.auth,
                args: [
                    "Код авторизации"
                ],
                argsRequired: false
            }
        ];

        const { clientId, redirectUrl: redirectUri } = this.state;

        this.spotify = new SpotifyAPI({
            clientId,
            redirectUri
        });

        this.client = axios.create({
            baseURL: redirectUri
        });
    }

    start(): void {
        const state = this.proxy.config.plugins.spotify;
        const { accessToken, code, expiresIn, refreshToken } = state;

        this.state = state;

        if (!code) {
            this.proxy.client.context.send(`${this.meta.prefix} Для работы плагина необходима авторизация.`);
            this.auth();

            return;
        }

        this.spotify.setRefreshToken(refreshToken);

        if (!accessToken || expiresIn <= Date.now()) {
            return this.refreshToken();
        }

        this.spotify.setAccessToken(accessToken);

        this.getUser()
            .then(() => {
                this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${this.state.username}.`);

                this.getCurrentPlaying();

                this.getCurrentPlayingInterval = setInterval(this.getCurrentPlaying.bind(this), 3 * 1000);
                this.actionbarUpdateInterval = setInterval(this.actionbarUpdate.bind(this), 1000);
            });
    }

    private gui(): void {
        const { code, accessToken } = this.state;

        if (code && accessToken) {
            if (this.currentPlaying) {
                this.proxy.client.context.pagesBuilder()
                    .setInventoryType("generic_9x6")
                    .addPages(() => {
                        const { is_playing, progress_ms, device: { volume_percent }, item: { artists, name, explicit, duration_ms } } = this.currentPlaying;

                        return new Page()
                            .setWindowTitle(
                                new RawJSONBuilder()
                                    .setText(this.meta.prefix)
                                    .setExtra(
                                        new RawJSONBuilder()
                                            .setText({
                                                text: ` ${this.state.username}`,
                                                color: "white"
                                            })
                                    )
                            )
                            .setItems([
                                new Item({
                                    id: SONG_ITEM,
                                    position: 4,
                                    nbt: new NBT("compound", {
                                        display: new NBT("compound", {
                                            Name: new NBT("string", new RawJSONBuilder()
                                                .setText({
                                                    text: `${is_playing ? "⏵" : "⏸"} ${explicit ? "[§cE§r] " : ""}${name}`,
                                                    italic: false
                                                })),
                                            Lore: new NBT("list", new NBT("string", [
                                                new RawJSONBuilder()
                                                    .setText(`§2${artists.join("§f, §2")}`),
                                                new RawJSONBuilder()
                                                    .setText(""),
                                                new RawJSONBuilder()
                                                    .setText(`§7${normalizeDuration(progress_ms)} §f/ §7${normalizeDuration(duration_ms)}`)
                                            ]))
                                        })
                                    }),
                                    onClick: () => this.changePlaybackState()
                                }),
                                new Item({
                                    id: PREVIOUS_SONG_ITEM,
                                    position: 2,
                                    nbt: new NBT("compound", {
                                        display: new NBT("compound", {
                                            Name: new NBT("string", new RawJSONBuilder()
                                                .setText({
                                                    text: "§cНазад",
                                                    italic: false
                                                }))
                                        })
                                    }),
                                    onClick: () => {
                                        this.skipTo("previous");
                                    }
                                }),
                                new Item({
                                    id: NEXT_SONG_ITEM,
                                    position: 6,
                                    nbt: new NBT("compound", {
                                        display: new NBT("compound", {
                                            Name: new NBT("string", new RawJSONBuilder()
                                                .setText({
                                                    text: "§2Далее",
                                                    italic: false
                                                }))
                                        })
                                    }),
                                    onClick: () => {
                                        this.skipTo();
                                    }
                                }),
                                // eslint-disable-next-line new-cap
                                ...Slider({
                                    cellsCount: 7,
                                    initialPosition: 19,
                                    value: volume_percent,
                                    max: 100,
                                    onClick: (value) => this.setVolume(value),
                                    nbt: (value) => new NBT("compound", {
                                        display: new NBT("compound", {
                                            Name: new NBT("string", new RawJSONBuilder()
                                                .setText({
                                                    text: `Текущая громкость §2${volume_percent}§f%`,
                                                    italic: false
                                                })),
                                            Lore: new NBT("list", new NBT("string", [
                                                new RawJSONBuilder()
                                                    .setText(`§7Нажмите, для того чтобы установить громкость на §2${value}§f%`)
                                            ]))
                                        })
                                    })
                                }),
                                // eslint-disable-next-line new-cap
                                ...Slider({
                                    cellsCount: 7,
                                    initialPosition: 37,
                                    value: progress_ms,
                                    max: duration_ms,
                                    onClick: (value) => this.seekTo(value),
                                    nbt: (value) => new NBT("compound", {
                                        display: new NBT("compound", {
                                            Name: new NBT("string", new RawJSONBuilder()
                                                .setText({
                                                    text: `Текущая позиция §2${normalizeDuration(progress_ms)}`,
                                                    italic: false
                                                })),
                                            Lore: new NBT("list", new NBT("string", [
                                                new RawJSONBuilder()
                                                    .setText(`§7Нажмите, для того чтобы установить позицию на §2${normalizeDuration(value)}`)
                                            ]))
                                        })
                                    })
                                })
                            ]);
                    })
                    .setAutoRerenderInterval(1000)
                    .build();
            } else {
                this.proxy.client.context.send(`${this.meta.prefix} §cВ данный момент ничего не играет!`);
            }
        } else {
            this.proxy.client.context.send(`${this.meta.prefix} §cПеред использованием этой команды необходимо авторизоваться!`);
        }
    }

    private actionbarUpdate(): void {
        let { template: { explicit: templateExplicit, output } } = this.state;

        if (this.currentPlaying) {
            const { progress_ms, item: { artists, name, explicit, duration_ms } } = this.currentPlaying;

            if (this.currentPlaying.is_playing && progress_ms < duration_ms + 1000) {
                this.currentPlaying.progress_ms += 1000;

                output = output.replace("%e", explicit ? templateExplicit : "")
                    .replace("%n", name)
                    .replace("%a", artists.join(", "))
                    .replace("%p", normalizeDuration(progress_ms))
                    .replace("%d", normalizeDuration(duration_ms));

                this.proxy.client.context.sendTitle({
                    actionbar: output
                });
            }
        }
    }

    private getCurrentPlaying(): void {
        this.spotify.getMyCurrentPlaybackState({
            market: this.state.market
        })
            .then(({ body: data }) => {
                if (data.item) {
                    if ("artists" in data.item) {
                        data.item.artists = data.item.artists.map(({ name }: any) => name);
                    }

                    this.currentPlaying = data;
                }
            })
            .catch(({ statusCode, syscall, code }) => {
                if (syscall === "connect" || code === "ENOTFOUND") {
                    return;
                }

                switch (statusCode) {
                    case 401:
                        this.refreshToken();
                        break;
                    default:
                        console.log(statusCode);

                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при загрузке текущего трека!`);
                        break;
                }
            });
    }

    private getUser(): Promise<void> {
        this.proxy.client.context.send(`${this.meta.prefix} Загрузка данных пользователя...`);

        return this.spotify.getMe()
            .then(({ body: { display_name } }) => {
                this.state.username = display_name as string;

                db.set(`plugins.${this.meta.name}.username`, display_name)
                    .write();
            })
            .catch(({ body: { error: { status, message } } }) => {
                switch (status) {
                    case 401:
                        this.refreshToken();
                        break;
                    default:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при загрузке информации о пользователе.`);
                        console.error(message);
                        break;
                }
            });
    }

    private skipTo(switchType: "next" | "previous" = "next"): void {
        if (this.cooldown < Date.now()) {
            this.updateCooldown();

            if (switchType === "previous" && (this.currentPlaying.progress_ms > 10 * 1000 || this.currentPlaying.actions.disallows.skipping_prev)) {
                return this.seekTo(0);
            }

            (
                switchType === "next" ?
                    this.spotify.skipToNext()
                    :
                    this.spotify.skipToPrevious()
            )
                .catch(({ statusCode }) => {
                    switch(statusCode) {
                        case 403:
                            this.seekTo(0);
                            break;
                        default:
                            this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при переключении трека!`);
                            break;
                    }
                });
        }
    }

    private seekTo(position: number): void {
        if (this.currentPlaying.progress_ms !== position) {
            this.currentPlaying.progress_ms = position;

            this.spotify.seek(position)
                .catch((error) => {
                    this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при изменении позиции воиспроизведения!`);

                    console.log(error);
                });
        }
    }

    private setVolume(volume: number): void {
        if (this.currentPlaying.device.volume_percent !== volume) {
            this.currentPlaying.device.volume_percent = volume;

            this.spotify.setVolume(volume)
                .catch((error) => {
                    this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при установки громкости!`);

                    console.log(error);
                });
        }
    }

    private changePlaybackState(): void {
        if (this.cooldown < Date.now()) {
            this.updateCooldown();

            (
                this.currentPlaying.is_playing ?
                    this.spotify.pause()
                    :
                    this.spotify.play()
            )
                .catch((error) => {
                    this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при изменение состояния воиспроизведения!`);

                    this.currentPlaying.is_playing = !this.currentPlaying.is_playing;

                    console.log(error);
                });

            this.currentPlaying.is_playing = !this.currentPlaying.is_playing;
        }
    }

    private updateCooldown(): void {
        const COOLDOWN = 3;

        this.cooldown = Date.now() + COOLDOWN * 1000;

        this.proxy.client.context.setCooldown({
            id: [NEXT_SONG_ITEM, PREVIOUS_SONG_ITEM, SONG_ITEM],
            cooldown: COOLDOWN
        });
    }

    private refreshToken(): void {
        this.stop();

        this.client.post("", `token=${this.state.refreshToken}`)
            .then(({ data }) => data)
            .then(({ access_token: accessToken, expires_in: expiresIn }: any) => {
                this.spotify.setAccessToken(accessToken);

                db.update(`plugins.${this.meta.name}`, (state) => ({
                    ...state,
                    accessToken,
                    expiresIn
                }))
                    .write();

                this.restart();
            })
            .catch(({ response: { data: { statusCode } } }) => {
                switch (statusCode) {
                    case 400:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при обновлении токена, авторизуйтесь заново!`);

                        this.clearCredentials();
                        this.restart();
                        break;
                    default:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при обновлении токена.`);
                        break;
                }
            });
    }

    private async auth(state = ""): Promise<void> {
        if (!state) {
            return this.proxy.client.context.send(
                new RawJSONBuilder()
                    .setText(`${this.meta.prefix} `)
                    .setExtra([
                        new RawJSONBuilder().setText({
                            text: "Авторизоваться",
                            underlined: true,
                            bold: true,
                            clickEvent: {
                                action: "open_url",
                                value: this.spotify.createAuthorizeURL(this.state.scope, generateID(6))
                            },
                            hoverEvent: {
                                action: "show_text",
                                value: new RawJSONBuilder()
                                    .setText("§7Нажмите, чтобы открыть страницу с авторизацией.")
                            }
                        })
                    ])
            );
        }

        if (this.authStarted) {
            return this.proxy.client.context.send(
                `${this.meta.prefix} §cДождитесь окончания предыдущей попытки авторизации!`
            );
        }

        this.authStarted = true;

        this.proxy.client.context.send(`${this.meta.prefix} Авторизация...`);

        await this.client.post("", `state=${state}`)
            .then(({ data }) => data)
            .then(({ code, access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, scope: scopes }) => {
                if (this.state.code === code) {
                    return this.proxy.client.context.send(`${this.meta.prefix} §eВы уже авторизованы!`);
                }

                if (this.state.scope.toString() !== this.state.scope.filter((scope) => scopes.includes(scope)).toString()) {
                    this.proxy.client.context.send(`${this.meta.prefix} §cВы не выдали нужные права приложению при авторизации, авторизуйтесь заново!`);
                    return this.auth();
                }

                db.update(`plugins.${this.meta.name}`, (state) => ({
                    ...state,
                    code,
                    accessToken,
                    refreshToken,
                    expiresIn
                }))
                    .write();

                this.restart();
            })

            .catch(({ response: { data: { statusCode, body } } }) => {
                switch (statusCode) {
                    case 400:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cНедействительный код для авторизации или срок его действия истек!`
                        );
                        break;
                    default:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cПроизошла ошибка при получении кода авторизации.`
                        );

                        console.error(body);
                        break;
                }
            });

        this.authStarted = false;
    }

    private clearCredentials(): void {
        db.update(`plugins.${this.meta.name}`, (state) => ({
            ...state,
            accessToken: "",
            refreshToken: "",
            expiresIn: 0,
            code: ""
        }))
            .write();
    }

    stop(): void {
        if (this.actionbarUpdateInterval) {
            clearInterval(this.actionbarUpdateInterval);
        }

        if (this.getCurrentPlayingInterval) {
            clearInterval(this.getCurrentPlayingInterval);
        }
    }
}
