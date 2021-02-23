import axios, { AxiosInstance } from "axios";
import { RawJSONBuilder } from "rawjsonbuilder";

import { Proxy } from "../Proxy";
import { Plugin } from "./Plugin";

import { db } from "../../DB";

import { generateID } from "../../utils";

import { ISpotify } from "../../interfaces";

export class Spotify extends Plugin {

    client: AxiosInstance;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    state: ISpotify;
    currentPlaying?: any; // Todo
    getCurrentPlayingInterval?: NodeJS.Timeout;
    actionbarUpdateInterval?: NodeJS.Timeout;

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "spotify",
            description: "Spotify интеграция",
            prefix: "[§aSpotify§r]"
        });

        this.meta.commands = [
            {
                name: "auth",
                handler: this.auth
            }
        ];

        this.client = axios.create({
            baseURL: "https://api.spotify.com/v1/"
        });
    }

    async start(): Promise<void> {
        const state = await db.get(`plugins.${this.meta.name}`)
            .value();
        const { accessToken, code, expiresIn } = state;

        this.state = state;

        if (code) {
            if (accessToken && expiresIn > Date.now()) {
                this.getUser()
                    .then(async (username) => {
                        await db.set(`plugins.${this.meta.name}.username`, username)
                            .write();

                        this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${username}!`);

                        this.getCurrentPlaying();

                        this.getCurrentPlayingInterval = setInterval(this.getCurrentPlaying.bind(this), 3 * 1000);
                        this.actionbarUpdateInterval = setInterval(this.actionbarUpdate.bind(this), 1000);
                    })
                    .catch((error) => {
                        switch (error?.response?.status) {
                            case 400:
                                this.refreshToken();
                                break;
                            default:
                                this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при загрузке информации о пользователе.`);
                                /*Console.error(error);*/
                        }
                    });
            } else {
                this.refreshToken();
            }
        } else {
            this.proxy.client.context.send(new RawJSONBuilder()
                .setText(`${this.meta.prefix} Для работы плагина необходима авторизация. `)
                .setExtra([
                    new RawJSONBuilder()
                        .setText("["),
                    new RawJSONBuilder().setText({
                        text: "Авторизоваться",
                        color: "dark_green",
                        bold: true,
                        underlined: true,
                        clickEvent: {
                            action: "open_url",
                            value: `https://accounts.spotify.com/${this.state.market.toLowerCase()}/authorize?client_id=${this.state.clientId}&state=${generateID(6)}&redirect_uri=${this.state?.redirectUrl}&response_type=code&scope=user-read-private%20user-modify-playback-state%20user-read-currently-playing`
                        }
                    }),
                    new RawJSONBuilder()
                        .setText("]")
                ]));
        }
    }

    getCurrentPlaying(): void {
        this.client.get(`/me/player/currently-playing?access_token=${this.state.accessToken}&market=${this.state.market}`)
            .then(({ data }) => this.currentPlaying = data)
            .catch((error) => {
                switch (error?.response?.status) {
                    case 401:
                        this.refreshToken();
                        break;
                    default:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при загрузке текущего трека!`);
                        /*Console.error(error);*/
                }
            });
    }

    actionbarUpdate(): void {
        let { template: { explicit: templateExplicit, output } } = this.state;

        if (this.currentPlaying) {
            let { is_playing, progress_ms, item: { artists, name, explicit, duration_ms } } = this.currentPlaying;

            this.currentPlaying.progress_ms += 1000;

            if (is_playing && progress_ms <= duration_ms) {
                artists = artists.map(({ name }: any) => name);

                output = output.replace("%e", explicit ? templateExplicit : "")
                    .replace("%n", name)
                    .replace("%a", artists.join(", "))
                    .replace("%p", this.normalizeDuration(progress_ms))
                    .replace("%d", this.normalizeDuration(duration_ms));

                this.proxy.client.context.sendTitle({
                    actionbar: output
                });
            }
        }
    }

    getUser(): Promise<string> {
        this.proxy.client.context.send(`${this.meta.prefix} Загрузка данных пользователя...`);

        return this.client.get(`/me?access_token=${this.state.accessToken}`)
            .then(({ data: { display_name } }) => display_name);
    }

    async refreshToken(): Promise<void> {
        this.proxy.client.context.send(`${this.meta.prefix} Обновление токена...`);

        const postData = `grant_type=${
            this.state.refreshToken ?
                "refresh_token"
                :
                "authorization_code"
        }&${
            this.state.refreshToken ?
                `refresh_token=${this.state.refreshToken}`
                :
                `code=${this.state.code}`
        }&redirect_uri=${this.state.redirectUrl}`;

        await this.client.post("https://accounts.spotify.com/api/token", postData, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${this.state.clientId}:${this.state.clientSecret}`).toString("base64")}`
            }
        })
            .then(async ({ data: { access_token, refresh_token, expires_in } }) => {
                await db.set(`plugins.${this.meta.name}.accessToken`, access_token)
                    .set(`plugins.${this.meta.name}.expiresIn`, Date.now() + expires_in * 1000)
                    .write();

                if (refresh_token) {
                    await db.set(`plugins.${this.meta.name}.refreshToken`, refresh_token)
                        .write();
                }

                this.stop();
                this.start();
            })
            .catch(async (error) => {
                switch (error?.response?.status) {
                    case 400:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при обновлении токена, авторизуйтесь заново!`);

                        await this.clearCredentials();
                        this.start();
                        break;
                    default:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при обновлении токена.`);
                        /*Console.error(error);*/
                }
            });
    }

    auth(state: string): void {
        if (state) {
            axios.post(this.state.redirectUrl, `state=${state}`)
                .then(async ({ data: { code } }) => {
                    if (this.state.code !== code) {
                        await this.clearCredentials();

                        await db.set(`plugins.${this.meta.name}.code`, code)
                            .write();

                        this.stop();
                        this.start();
                    } else {
                        this.proxy.client.context.send(`${this.meta.prefix} §eВы уже авторизованы!`);
                    }
                })
                .catch((error) => {
                    switch (error?.response?.status) {
                        case 400:
                            this.proxy.client.context.send(`${this.meta.prefix} §cНедействительный код для авторизации!`);
                            break;
                        default:
                            this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при получении кода авторизации.`);
                            /*Console.error(error);*/
                    }
                });
        }
    }

    async clearCredentials(clearCode = true): Promise<void> {
        await db.set(`plugins.${this.meta.name}.accessToken`, "")
            .set(`plugins.${this.meta.name}.refreshToken`, "")
            .set(`plugins.${this.meta.name}.expiresIn`, 0)
            .write();

        if (clearCode) {
            await db.set(`plugins.${this.meta.name}.code`, "")
                .write();
        }
    }

    normalizeDuration(duration: number): string {
        duration = Math.floor(duration / 1000);

        const minutes = Math.floor((duration %= 3600) / 60);
        const seconds = duration % 60;

        const pad = (number: number) => number > 9 ? String(number) : `0${number}`;

        return `${pad(minutes)}:${pad(seconds)}`;
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
