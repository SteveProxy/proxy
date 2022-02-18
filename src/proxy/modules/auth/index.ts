import axios from 'axios';
import moment from 'moment';
import { PublicClientApplication, JsonCache, ClientAuthError } from '@azure/msal-node';
import { DeviceCodeResponse, TokenCacheContext } from '@azure/msal-common';
import { ClickAction, HoverAction, keybind, text, translate } from 'rawjsonbuilder';

import { config } from '../../../config';

import { IClient, IMinecraftProfileResponse, IXboxLiveAuthErrorResponse, Proxy, XboxLiveAuthError } from '../../';

import { IMinecraftAuthResponse, IXboxLiveAuthResponse } from './types';

const { bridge: { title } } = config.data!;

const XBOX_LIVE_AUTH_ENDPOINT = 'https://user.auth.xboxlive.com/user/authenticate';
const XBOX_LIVE_SECURITY_AUTH_ENDPOINT = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MINECRAFT_AUTH_ENDPOINT = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MINECRAFT_PROFILE_ENDPOINT = 'https://api.minecraftservices.com/minecraft/profile';

export class Auth {

    #proxy: Proxy;

    uuid = '';
    username = '';

    #microsoftClient = new PublicClientApplication({
        auth: {
            clientId: 'ec3e7231-808b-4508-9242-2574171585aa',
            authority: 'https://login.microsoftonline.com/consumers'
        },
        cache: {
            cachePlugin: {
                // @ts-ignore Invalid lib types
                beforeCacheAccess: this.#beforeCacheAccess.bind(this),
                // @ts-ignore Invalid lib types
                afterCacheAccess: this.#afterCacheAccess.bind(this)
            }
        }
    });
    #microsoftAccessToken = '';
    #microsoftRefreshToken = '';
    #microsoftAccessTokenExpiresIn = 0;

    #xboxLiveAccessToken = '';
    #xboxLiveUserHash = '';
    #xboxLiveSecurityToken = '';

    #minecraftAccessToken = '';
    #minecraftAccessTokenExpiresIn = 0;

    constructor(proxy: Proxy) {
        this.#proxy = proxy;

        const { microsoftSession, minecraftSession } = proxy.userConfig;

        if (microsoftSession) {
            this.#fillMicrosoftCredentials(microsoftSession);
        }

        if (minecraftSession) {
            this.#fillMinecraftCredentials(minecraftSession);
        }
    }

    async getSession(silent?: boolean): Promise<Pick<IClient, 'uuid' | 'username' | 'session'> | null> {
        if (!silent) {
            this.#proxy.client.context.send(`${title} | Загрузка сессии...`);
        }

        const microsoftToken = await this.#getMicrosoftToken()
            .catch((error) => {
                const subError = error?.subError;

                switch (subError) {
                    case 'bad_token':
                        this.#dropSession();

                        this.#proxy.client.context.send(`${title} | Сессия устарела`);
                        break;
                    default:
                        console.log(error);
                        break;
                }

                return null;
            });

        if (!microsoftToken) {
            return this.getSession();
        }

        if (!silent) {
            this.#proxy.client.context.send(`${title} | Выполняется вход...`);
        }

        if (!this.hasSession) {
            await this.#getXboxLiveAccessToken();
            await this.#getXboxLiveSecurityToken();

            await this.#getMinecraftAccessToken();
        }

        if (!silent) {
            await this.#getMinecraftProfile();

            this.#proxy.client.context.send(`${title} | Авторизован под ${this.username}`);
        }

        return this.#session;
    }

    get hasSession(): boolean {
        return Boolean(
            this.#minecraftAccessToken &&
            this.#minecraftAccessTokenExpiresIn > Date.now()
        );
    }

    clearSession() {
        this.uuid = '';
        this.username = '';
        this.#minecraftAccessToken = '';
        this.#minecraftAccessTokenExpiresIn = 0;
    }

    get #session(): Pick<IClient, 'uuid' | 'username' | 'session'> {
        const { uuid, username } = this;

        return {
            uuid,
            username,
            session: {
                accessToken: this.#minecraftAccessToken,
                selectedProfile: {
                    id: uuid,
                    name: username
                }
            }
        };
    }

    #getMicrosoftToken(): Promise<string | void> {
        const client = this.#microsoftClient;

        const scopes = [
            'XboxLive.signin',
            'offline_access'
        ];

        if (!this.#microsoftAccessToken) {
            return client.acquireTokenByDeviceCode({
                scopes,
                deviceCodeCallback: this.#sendCode.bind(this)
            })
                .then((session) => {
                    if (session) {
                        const { accessToken } = session;

                        this.#microsoftAccessToken = accessToken;

                        return accessToken;
                    }
                })
                .catch((error) => {
                    if (error instanceof ClientAuthError) {
                        const { errorCode } = error;

                        switch (errorCode) {
                            case 'device_code_expired':
                                this.#proxy.client.context.send(`${title} | §cВремя действия кода истекло!`);
                                break;
                        }
                    }

                    throw error;
                });
        }

        const refreshToken = this.#microsoftRefreshToken;

        if (refreshToken && this.#microsoftAccessTokenExpiresIn < Date.now()) {
            return client.acquireTokenByRefreshToken({
                scopes,
                refreshToken
            })
                .then((session) => {
                    if (session) {
                        const { accessToken } = session;

                        this.#microsoftAccessToken = accessToken;

                        return accessToken;
                    }
                });
        }

        return Promise.resolve();
    }

    #getXboxLiveAccessToken(): Promise<void> {
        return axios.post<IXboxLiveAuthResponse>(XBOX_LIVE_AUTH_ENDPOINT, {
            Properties: {
                AuthMethod: 'RPS',
                SiteName: 'user.auth.xboxlive.com',
                RpsTicket: `d=${this.#microsoftAccessToken}`
            },
            RelyingParty: 'http://auth.xboxlive.com',
            TokenType: 'JWT'
        })
            .then(({ data: { Token, DisplayClaims: { xui: [{ uhs }] } } }) => {
                this.#xboxLiveAccessToken = Token;
                this.#xboxLiveUserHash = uhs;
            });
    }

    #getXboxLiveSecurityToken(): Promise<string> {
        return axios.post<IXboxLiveAuthResponse>(XBOX_LIVE_SECURITY_AUTH_ENDPOINT, {
            Properties: {
                SandboxId: 'RETAIL',
                UserTokens: [
                    this.#xboxLiveAccessToken
                ]
            },
            RelyingParty: 'rp://api.minecraftservices.com/',
            TokenType: 'JWT'
        })
            .then(({ data: { Token } }) => {
                this.#xboxLiveSecurityToken = Token;

                return Token;
            })
            .catch((error) => {
                if (axios.isAxiosError(error)) {
                    const { XErr } = error.response?.data as IXboxLiveAuthErrorResponse;

                    switch (XErr) {
                        case XboxLiveAuthError.NOT_EXIST:
                            this.#proxy.client.context.send(
                                text(`${title} | §cУ данной учётной записи нет аккаунта Xbox Live! Создайте его и повторите попытку входа.`)
                            );
                            break;
                        case XboxLiveAuthError.COUNTRY_UNAVAILABLE:
                            this.#proxy.client.context.send(
                                text(`${title} | §cСервисы Xbox Live недоступны в Вашем регионе.`)
                            );
                            break;
                        case XboxLiveAuthError.CHILD:
                            this.#proxy.client.context.send(
                                text(`${title} | §cУ данной учётной детский статус. Попросите родителя добавить Вас в семейную учётную запись и повторите попытку входа.`)
                            );
                            break;
                    }
                }

                throw error;
            });
    }

    #getMinecraftAccessToken(): Promise<string> {
        return axios.post<IMinecraftAuthResponse>(MINECRAFT_AUTH_ENDPOINT, {
            identityToken: `XBL3.0 x=${this.#xboxLiveUserHash};${this.#xboxLiveSecurityToken}`
        })
            .then(({ data: { access_token, expires_in } }) => {
                expires_in = Date.now() + expires_in;

                this.#fillMinecraftCredentials({
                    access_token,
                    expires_in
                });

                this.#proxy.userConfig.minecraftSession = {
                    access_token,
                    expires_in
                };
                this.#proxy.user.write();

                return access_token;
            });
    }

    #getMinecraftProfile(): Promise<IMinecraftProfileResponse> {
        return axios.get<IMinecraftProfileResponse>(MINECRAFT_PROFILE_ENDPOINT, {
            headers: {
                authorization: `Bearer ${this.#minecraftAccessToken}`
            }
        })
            .then(({ data }) => {
                const { id, name } = data;

                this.uuid = id;
                this.username = name;

                return data;
            });
    }

    /**
     * Send Microsoft Auth Device Code to Minecraft client
     */
    #sendCode({ userCode, verificationUri, expiresIn }: DeviceCodeResponse): void {
        this.#proxy.client.context.send(
            translate(`${title} | Для входа в Microsoft аккаунт, перейдите по адресу и введите код %s. Код истечёт через %s.`, [
                text(userCode)
                    .setInsertion(userCode)
                    .setHoverEvent({
                        action: HoverAction.SHOW_TEXT,
                        value: translate('§7Нажмите с использованием %s§7, чтобы скопировать код.', [
                            keybind('key.sneak')
                        ])
                    })
                    .setUnderlined()
                    .setBold(),
                text(
                    moment.duration(expiresIn * 1_000)
                        .humanize()
                )
            ])
                .addNewLine()
                .addNewLine()
                .addExtra(
                    text('Авторизоваться')
                        .setUnderlined()
                        .setBold()
                        .setClickEvent({
                            action: ClickAction.OPEN_URL,
                            value: verificationUri
                        })
                        .setHoverEvent({
                            action: HoverAction.SHOW_TEXT,
                            value: text('§7Нажмите, чтобы открыть страницу с авторизацией.')
                        })
                )
        );
    }

    /**
     * Microsoft cache plugin method
     */
    #beforeCacheAccess(context: TokenCacheContext): void {
        const { microsoftSession } = this.#proxy.userConfig;

        context.tokenCache.deserialize(microsoftSession!);
    }

    /**
     * Microsoft cache plugin method
     */
    #afterCacheAccess(context: TokenCacheContext): void {
        if (context.cacheHasChanged) {
            const session = context.tokenCache.serialize();

            this.#proxy.userConfig.microsoftSession = session;

            this.#proxy.user.write();

            this.#fillMicrosoftCredentials(session);
        }
    }

    #dropSession(): void {
        this.#microsoftAccessToken = '';

        delete this.#proxy.userConfig.microsoftSession;
        delete this.#proxy.userConfig.minecraftSession;

        this.#proxy.user.write();
    }

    #fillMicrosoftCredentials(session: string): void {
        const parsedSession: JsonCache = JSON.parse(session);

        const [{ secret: accessToken, expires_on }] = Object.values(parsedSession.AccessToken);
        const [{ secret: refreshToken }] = Object.values(parsedSession.RefreshToken);

        this.#microsoftAccessToken = accessToken;
        this.#microsoftRefreshToken = refreshToken;
        this.#microsoftAccessTokenExpiresIn = Number(expires_on);
    }

    #fillMinecraftCredentials({ access_token, expires_in }: Pick<IMinecraftAuthResponse, 'access_token' | 'expires_in'>): void {
        this.#minecraftAccessToken = access_token;
        this.#minecraftAccessTokenExpiresIn = expires_in;
    }
}

export * from './types';
