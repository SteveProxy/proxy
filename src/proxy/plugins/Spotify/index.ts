import axios, { AxiosInstance } from 'axios';
import SpotifyAPI from 'spotify-web-api-node';
import { ClickAction, HoverAction, text } from 'rawjsonbuilder';

import { PacketContext, Proxy } from '../../';
import { Plugin } from '../plugin';
import { Inventory, Item, NBT, Page, Slider } from '../../modules';

import { generateRandomString, minecraftData, normalizeDuration } from '../../../utils';

export interface ISpotify {
    code: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    template: {
        explicit: string;
        // %e - explicit, %n - name, %a - artists, %p - progress, %d - duration
        output: string;
    };
}

const NEXT_SONG_ITEM = minecraftData.findItemOrBlockByName('green_stained_glass').id;
const PREVIOUS_SONG_ITEM = minecraftData.findItemOrBlockByName('red_stained_glass').id;
const SONG_ITEM = minecraftData.findItemOrBlockByName('name_tag').id;

const AUTH_SCOPE = [
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-read-private'
];

export class Spotify extends Plugin<ISpotify> {

    #spotify = new SpotifyAPI({
        clientId: '43801ea120f44b81854f55dfc4e4c711',
        redirectUri: 'https://steveproxy.herokuapp.com/spotify/'
    });
    #client: AxiosInstance;
    #state: ISpotify = this.proxy.userConfig.plugins.spotify;

    #username = '';
    #currentPlaying?: any;
    #getCurrentPlayingInterval?: NodeJS.Timeout;
    #actionbarUpdateInterval?: NodeJS.Timeout;
    #cooldown = 0;
    #authStarted = false;

    #actionBarHandler = (context: PacketContext) => {
        if (this.#currentPlaying?.is_playing) {
            if (context.meta.name === 'chat' && context.packet.position !== 2) {
                return;
            }

            context.setCanceled();
        }
    };

    constructor(proxy: Proxy) {
        super(proxy, {
            name: 'spotify',
            description: 'Spotify интеграция',
            prefix: '§2§lSpotify'
        }, {
            code: '',
            accessToken: '',
            expiresIn: 0,
            refreshToken: '',
            template: {
                explicit: '[§cE§r]',
                output: '%e %n - §2%a§r (§7%p§r / §7%d§r)'
            }
        });

        this.meta.commands = [
            {
                name: '',
                description: 'Графический интерфейс',
                handler: this.#gui
            },
            {
                name: 'auth',
                description: 'Авторизация в плагине',
                handler: this.#auth,
                args: [
                    'Код авторизации'
                ],
                argsRequired: false
            }
        ];

        this.#client = axios.create({
            baseURL: this.#spotify.getRedirectURI()
        });
    }

    start(): void {
        const state = this.proxy.userConfig.plugins.spotify;
        const { accessToken, code, expiresIn, refreshToken } = state;

        this.#state = state;

        if (!code) {
            this.proxy.client.context.send(`${this.meta.prefix} Для работы плагина необходима авторизация.`);
            this.#auth();

            return;
        }

        this.#spotify.setRefreshToken(refreshToken);

        if (!accessToken || expiresIn <= Date.now()) {
            return this.#refreshToken();
        }

        this.#spotify.setAccessToken(accessToken);

        this.#getUser()
            .then(() => {
                this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${this.#username}.`);

                this.#getCurrentPlaying();

                this.#getCurrentPlayingInterval = setInterval(this.#getCurrentPlaying.bind(this), 3 * 1_000);
                this.#actionbarUpdateInterval = setInterval(this.#actionBarUpdate.bind(this), 1_000);
            });

        this.#handleActionBarUpdate();
    }

    #gui(): void {
        const { code, accessToken } = this.#state;

        if (!code || !accessToken) {
            return this.proxy.client.context.send(
                `${this.meta.prefix} §cПеред использованием этой команды необходимо авторизоваться!`
            );
        }

        if (!this.#currentPlaying) {
            return this.proxy.client.context.send(`${this.meta.prefix} §cВ данный момент ничего не играет!`);
        }

        this.proxy.client.context.pagesBuilder()
            .setInventoryType(Inventory.GENERIC_9X6)
            .addPages(() => {
                const { is_playing, progress_ms, device: { volume_percent }, item: { artists, name, explicit, duration_ms } } = this.#currentPlaying;

                const page = new Page()
                    .setWindowTitle(
                        text(`${this.meta.prefix} §f${this.#username}`)
                    );

                page.setItems(
                    new Item({
                        id: PREVIOUS_SONG_ITEM,
                        position: 2,
                        nbt: NBT.compound({
                            display: NBT.compound({
                                Name: NBT.string(
                                    text('§cНазад')
                                        .setItalic(false)
                                )
                            })
                        }),
                        onClick: () => {
                            this.#skipTo('previous');
                        }
                    })
                );

                page.setItems(
                    new Item({
                        id: SONG_ITEM,
                        position: 4,
                        nbt: NBT.compound({
                            display: NBT.compound({
                                Name: NBT.string(
                                    text(`${is_playing ? '⏵' : '⏸'} ${explicit ? '[§cE§r] ' : ''}${name}`)
                                        .setItalic(false)
                                ),
                                Lore: NBT.list(
                                    NBT.string([
                                        text(`§2${artists.join('§f, §2')}`),
                                        text(''),
                                        text(`§7${normalizeDuration(progress_ms)} §f/ §7${normalizeDuration(duration_ms)}`)
                                    ])
                                )
                            })
                        }),
                        onClick: () => (
                            this.#changePlaybackState()
                        )
                    })
                );

                page.setItems(
                    new Item({
                        id: NEXT_SONG_ITEM,
                        position: 6,
                        nbt: NBT.compound({
                            display: NBT.compound({
                                Name: NBT.string(
                                    text('§2Далее')
                                        .setItalic(false)
                                )
                            })
                        }),
                        onClick: () => {
                            this.#skipTo();
                        }
                    })
                );

                page.setItems(
                    Slider({
                        cellsCount: 7,
                        initialPosition: 19,
                        value: volume_percent,
                        max: 100,
                        onClick: (value) => (
                            this.#setVolume(value)
                        ),
                        nbt: (value) => (
                            NBT.compound({
                                display: NBT.compound({
                                    Name: NBT.string(
                                        text(`Текущая громкость §2${volume_percent}§f%`)
                                            .setItalic(false)
                                    ),
                                    Lore: NBT.list(
                                        NBT.string([
                                            text(`§7Нажмите, для того чтобы установить громкость на §2${value}§f%`)
                                        ])
                                    )
                                })
                            })
                        )
                    })
                );

                page.setItems(
                    Slider({
                        cellsCount: 7,
                        initialPosition: 37,
                        value: progress_ms,
                        max: duration_ms,
                        onClick: (value) => (
                            this.#seekTo(value)
                        ),
                        nbt: (value) => (
                            NBT.compound({
                                display: NBT.compound({
                                    Name: NBT.string(
                                        text(`Текущая позиция §2${normalizeDuration(progress_ms)}`)
                                            .setItalic(false)
                                    ),
                                    Lore: NBT.list(
                                        NBT.string([
                                            text(`§7Нажмите, для того чтобы установить позицию на §2${normalizeDuration(value)}`)
                                        ])
                                    )
                                })
                            })
                        )
                    })
                );

                return page;
            })
            .setAutoRerenderInterval(1_000)
            .build();
    }

    #actionBarUpdate(): void {
        let { template: { explicit: templateExplicit, output } } = this.#state;

        if (this.#currentPlaying) {
            const { progress_ms, item: { artists, name, explicit, duration_ms } } = this.#currentPlaying;

            if (this.#currentPlaying.is_playing && progress_ms < duration_ms + 1_000) {
                this.#currentPlaying.progress_ms += 1_000;

                output = output.replace('%e', explicit ? templateExplicit : '')
                    .replace('%n', name)
                    .replace('%a', artists.join(', '))
                    .replace('%p', normalizeDuration(progress_ms))
                    .replace('%d', normalizeDuration(duration_ms));

                this.proxy.client.context.sendTitle({
                    actionbar: output
                });
            }
        }
    }

    #getCurrentPlaying(): void {
        this.#spotify.getMyCurrentPlaybackState()
            .then(({ body: data }) => {
                if (data.item) {
                    if ('artists' in data.item) {
                        data.item.artists = data.item.artists.map(({ name }: any) => name);
                    }

                    data.item.duration_ms = this.#floorMilliseconds(data.item.duration_ms);
                    data.progress_ms = this.#floorMilliseconds(Number(data.progress_ms));

                    this.#currentPlaying = data;
                }
            })
            .catch(({ statusCode, syscall, code }) => {
                if (syscall === 'connect' || code === 'ENOTFOUND') {
                    return;
                }

                switch (statusCode) {
                    case 401:
                        this.#refreshToken();
                        break;
                    default:
                        console.log(statusCode);

                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cПроизошла ошибка при загрузке текущего трека!`
                        );
                        break;
                }
            });
    }

    #getUser(): Promise<void> {
        this.proxy.client.context.send(`${this.meta.prefix} Загрузка данных пользователя...`);

        return this.#spotify.getMe()
            .then(({ body: { display_name = '' } }) => {
                this.#username = display_name;
            })
            .catch(({ body: { error: { status, message } } }) => {
                switch (status) {
                    case 401:
                        this.#refreshToken();
                        break;
                    default:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cПроизошла ошибка при загрузке информации о пользователе.`
                        );

                        console.error(message);
                        break;
                }
            });
    }

    #skipTo(switchType: 'next' | 'previous' = 'next'): void {
        if (this.#cooldown < Date.now()) {
            this.#updateCooldown();

            if (switchType === 'previous' && (this.#currentPlaying.progress_ms > 10 * 1000 || this.#currentPlaying.actions.disallows.skipping_prev)) {
                return this.#seekTo(0);
            }

            (
                switchType === 'next' ?
                    this.#spotify.skipToNext()
                    :
                    this.#spotify.skipToPrevious()
            )
                .catch(({ statusCode }) => {
                    switch(statusCode) {
                        case 403:
                            this.#seekTo(0);
                            break;
                        default:
                            this.proxy.client.context.send(
                                `${this.meta.prefix} §cПроизошла ошибка при переключении трека!`
                            );
                            break;
                    }
                });
        }
    }

    #seekTo(position: number): void {
        if (this.#currentPlaying.progress_ms !== position) {
            this.#currentPlaying.progress_ms = position;

            this.#spotify.seek(position)
                .catch((error) => {
                    this.proxy.client.context.send(
                        `${this.meta.prefix} §cПроизошла ошибка при изменении позиции воиспроизведения!`
                    );

                    console.log(error);
                });
        }
    }

    #setVolume(volume: number): void {
        if (this.#currentPlaying.device.volume_percent !== volume) {
            this.#currentPlaying.device.volume_percent = volume;

            this.#spotify.setVolume(volume)
                .catch((error) => {
                    this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при установки громкости!`);

                    console.log(error);
                });
        }
    }

    #changePlaybackState(): void {
        if (this.#cooldown < Date.now()) {
            this.#updateCooldown();

            this.#spotify[this.#currentPlaying.is_playing ? 'pause' : 'play']()
                .catch((error) => {
                    this.proxy.client.context.send(
                        `${this.meta.prefix} §cПроизошла ошибка при изменение состояния воиспроизведения!`
                    );

                    this.#currentPlaying.is_playing = !this.#currentPlaying.is_playing;

                    console.log(error);
                });

            this.#currentPlaying.is_playing = !this.#currentPlaying.is_playing;
        }
    }

    #updateCooldown(): void {
        const COOLDOWN = 3;

        this.#cooldown = Date.now() + COOLDOWN * 1000;

        this.proxy.client.context.setCooldown({
            id: [NEXT_SONG_ITEM, PREVIOUS_SONG_ITEM, SONG_ITEM],
            cooldown: COOLDOWN
        });
    }

    #refreshToken(): void {
        this.stop();

        this.#client.post('', `token=${this.#state.refreshToken}`)
            .then(({ data }) => data)
            .then(({ access_token: accessToken, expires_in: expiresIn }: any) => {
                this.#spotify.setAccessToken(accessToken);

                this.updateConfig({
                    accessToken,
                    expiresIn
                });

                this.restart();
            })
            .catch(({ response: { data: { statusCode } } }) => {
                switch (statusCode) {
                    case 400:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при обновлении токена, авторизуйтесь заново!`);

                        this.#clearCredentials();
                        this.restart();
                        break;
                    default:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при обновлении токена.`);
                        break;
                }
            });
    }

    async #auth(state = ''): Promise<void> {
        if (!state) {
            const authUrl = this.#spotify.createAuthorizeURL(AUTH_SCOPE, generateRandomString(6));

            return this.proxy.client.context.send(
                text(this.meta.prefix)
                    .addSpace()
                    .addExtra(
                        text('Авторизоваться')
                            .setUnderlined()
                            .setBold()
                            .setClickEvent({
                                action: ClickAction.OPEN_URL,
                                value: authUrl
                            })
                            .setHoverEvent({
                                action: HoverAction.SHOW_TEXT,
                                value: text('§7Нажмите, чтобы открыть страницу с авторизацией.')
                            })
                    )
            );
        }

        if (this.#authStarted) {
            return this.proxy.client.context.send(
                `${this.meta.prefix} §cДождитесь окончания предыдущей попытки авторизации!`
            );
        }

        this.#authStarted = true;

        this.proxy.client.context.send(`${this.meta.prefix} Авторизация...`);

        await this.#client.post('', `state=${state}`)
            .then(({ data }) => data)
            .then(({ code, access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, scope: scopes }) => {
                if (this.#state.code === code) {
                    return this.proxy.client.context.send(`${this.meta.prefix} §eВы уже авторизованы!`);
                }

                if (AUTH_SCOPE.toString() !== AUTH_SCOPE.filter((scope) => scopes.includes(scope)).toString()) {
                    this.proxy.client.context.send(
                        `${this.meta.prefix} §cВы не выдали нужные права приложению при авторизации, авторизуйтесь заново!`
                    );

                    return this.#auth();
                }

                this.updateConfig({
                    code,
                    accessToken,
                    refreshToken,
                    expiresIn
                });

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

        this.#authStarted = false;
    }

    #clearCredentials(): void {
        this.updateConfig({
            accessToken: '',
            refreshToken: '',
            expiresIn: 0,
            code: ''
        });
    }

    #floorMilliseconds(value: number): number {
        return Math.floor(value / 1_000) * 1_000;
    }

    #handleActionBarUpdate() {
        this.proxy.packetManager.on(['action_bar', 'chat'], this.#actionBarHandler);
    }

    stop(): void {
        if (this.#actionbarUpdateInterval) {
            clearInterval(this.#actionbarUpdateInterval);
        }

        if (this.#getCurrentPlayingInterval) {
            clearInterval(this.#getCurrentPlayingInterval);
        }

        this.proxy.packetManager.removeListener(['action_bar', 'chat'], this.#actionBarHandler);
    }

    clear(): void {
        this.#handleActionBarUpdate();
    }
}
