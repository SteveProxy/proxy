import { APIErrorCode, CallbackService, CallbackServiceRetry, getRandomId, ICallbackServiceCaptchaPayload, ICallbackServiceTwoFactorPayload } from "vk-io";
import { AuthErrorCode, DirectAuthorization, officialAppCredentials } from "@vk-io/authorization";
import { ClickAction, RawJSONBuilder } from "rawjsonbuilder";

import { middlewares } from "./middlewares";
import { API_VERSION } from "./constants";

import { Plugin } from "../Plugin";
import { Proxy } from "../../Proxy";
import { PluginManager, separator } from "../../modules";
import { VK as _VK } from "./API";
import { Markdown } from "./Markdown";

import { IVK, PluginConfigFactory } from "../../../interfaces";
import { NotificationsNotificationItem } from "vk-io/lib/api/schemas/objects";

const { AUTHORIZATION_FAILED, FAILED_PASSED_CAPTCHA, FAILED_PASSED_TWO_FACTOR, TOO_MUCH_TRIES, WRONG_OTP, USERNAME_OR_PASSWORD_IS_INCORRECT, INVALID_PHONE_NUMBER, PAGE_BLOCKED, OTP_FORMAT_IS_INCORRECT } = AuthErrorCode;
const { AUTH, MESSAGES_USER_BLOCKED, MESSAGES_DENY_SEND, MESSAGES_PRIVACY, MESSAGES_CHAT_USER_NO_ACCESS, PARAM } = APIErrorCode;

export class VK extends Plugin<PluginConfigFactory<"vk">> {

    private state: IVK = this.proxy.config.plugins.vk;
    // @ts-ignore
    vk: _VK;
    private username = "";

    private authStarted = false;
    private callbackService = new CallbackService();

    private notificationsUpdateInterval?: NodeJS.Timeout;
    private lastNotificationsUpdate = Date.now();

    constructor(proxy: Proxy) {
        super(proxy, {
            name: "vk",
            description: "VK Интеграция",
            prefix: "§9§lVK"
        }, {
            token: "",
            user: 0,
            scope: [
                "friends",
                "offline",
                "notifications",
                "messages"
            ]
        });

        this.meta.commands = [
            {
                name: "auth",
                description: "Авторизация в плагине",
                handler: this.auth,
                argsRequired: false,
                args: [
                    "Логин",
                    "Пароль"
                ]
            },
            {
                name: "send",
                description: "Отправка сообщения",
                handler: this.send,
                args: [
                    "Получатель",
                    "Сообщение"
                ],
                hidden: true,
                sliceArgs: false
            }
        ];

        this.callbackService.onCaptcha(this.onCaptcha.bind(this));
        this.callbackService.onTwoFactor(this.onTwoFactor.bind(this));
    }

    start(): void {
        const state = this.proxy.config.plugins.vk;
        const { token, user } = state;

        this.state = state;

        if (!token) {
            this.proxy.client.context.send(`${this.meta.prefix} Для работы плагина необходима авторизация.`);

            return this.proxy.client.context.send(
                new RawJSONBuilder()
                    .setText(`${this.meta.prefix} `)
                    .setExtra([
                        new RawJSONBuilder()
                            .setText({
                                text: "Авторизоваться",
                                underlined: true,
                                bold: true,
                                clickEvent: {
                                    action: "run_command",
                                    value: `${PluginManager.prefix}${this.meta.name} auth`
                                },
                                hoverEvent: {
                                    action: "show_text",
                                    value: new RawJSONBuilder()
                                        .setText("§7Нажмите, чтобы начать авторизацию.")
                                }
                            })
                    ])
            );
        }

        const vk = new _VK({
            token
        });
        this.vk = vk;

        middlewares.forEach((Middleware) => {
            const middleware = new Middleware(this);

            // @ts-ignore
            vk.updates.on(middleware.name, middleware.handler.bind(middleware));
        });

        vk.updates.start()
            .then(async () => {
                const { name } = await vk.getByMultipleId(user);

                this.proxy.client.context.send(`${this.meta.prefix} Авторизован под ${name}.`);

                this.username = name;

                this.startNotificationsUpdates();
            })
            .catch((error) => {
                switch(error.code) {
                    case AUTH:
                        this.clearCredentials();
                        this.restart();
                        break;
                    default:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка подключения ВКонтакте!`);

                        console.error(error);
                        break;
                }
            });
    }

    private startNotificationsUpdates(): void {
        this.notificationsUpdateInterval = setInterval(() => {
            this.getNotifications();

            this.lastNotificationsUpdate = Date.now();
        }, 15_000);
    }

    private async getNotifications() {
        const notifications = await this.vk.api.notifications.get({})
            .then(({ items }) => items as NotificationsNotificationItem[])
            .catch((error) => {
                console.error(error);

                this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при обновлении уведомлений!`);

                return [];
            });

        notifications.filter(({ date = 0 }) => date >= this.lastNotificationsUpdate / 1000)
            .reverse()
            .forEach((notification) => {
                this.proxy.client.context.send(
                    new RawJSONBuilder()
                        .setText(`${this.meta.prefix} Уведомление:`)
                        .addExtra([
                            separator,
                            separator,
                            Markdown.parseNotification(notification)
                        ])
                );
            });
    }

    private stopNotificationsUpdates(): void {
        if (this.notificationsUpdateInterval) {
            clearInterval(this.notificationsUpdateInterval);
        }
    }

    private async auth(login = "", password = ""): Promise<void> {
        if (this.authStarted) {
            return this.proxy.client.context.send(
                `${this.meta.prefix} §cДождитесь окончания предыдущей попытки авторизации!`
            );
        }

        if (!login && !password) {
            const [login, password] = await this.proxy.client.context.questionBuilder()
                .setQuestions([
                    [`${this.meta.prefix} Введите логин.`, (login) => {
                        if (login.includes(" ")) {
                            return this.proxy.client.context.send(
                                `${this.meta.prefix} §cЛогин не может содержать пробелов!`
                            );
                        }

                        if (login.length < 6) {
                            return this.proxy.client.context.send(
                                `${this.meta.prefix} §cДлинна логина не может быть меньше 6 символов!`
                            );
                        }

                        return true;
                    }],
                    [`${this.meta.prefix} Введите пароль.`, (password) => {
                        if (password.includes(" ")) {
                            return this.proxy.client.context.send(
                                `${this.meta.prefix} §cПароль не может содержать пробелов!`
                            );
                        }

                        if (password.length < 8) {
                            return this.proxy.client.context.send(
                                `${this.meta.prefix} §cДлинна пароля не может быть меньше 8 символов!`
                            );
                        }

                        return true;
                    }]
                ])
                .build();

            return this.auth(login, password);
        }

        this.authStarted = true;

        const direct = new DirectAuthorization({
            ...officialAppCredentials.iphone,
            callbackService: this.callbackService,
            scope: this.state.scope,
            apiVersion: API_VERSION,
            login,
            password
        });

        await direct.run()
            .then(({ token, user }) => {
                this.updateConfig({
                    token,
                    user
                });

                this.restart();
            })
            .catch(({ code, ...error }) => {
                this.authStarted = false;

                switch (code) {
                    case USERNAME_OR_PASSWORD_IS_INCORRECT:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cНеправильный логин или пароль.`
                        );
                        break;
                    case WRONG_OTP:
                    case OTP_FORMAT_IS_INCORRECT:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cВы ввели неверный код.`
                        );
                        break;
                    case TOO_MUCH_TRIES:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cВы совершили слишком мнонго попыток авторизации, попробуйте через несколько часов.`
                        );
                        break;
                    case FAILED_PASSED_TWO_FACTOR:
                    case FAILED_PASSED_CAPTCHA:
                        return this.proxy.client.context.send(
                            `${this.meta.prefix} §cВы превысили максимальное количество попыток ввода, попробуйте авторизоваться снова.`
                        );
                    case INVALID_PHONE_NUMBER:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cНеверный номер телефона.`
                        );
                        break;
                    case PAGE_BLOCKED:
                        return this.proxy.client.context.send(
                            `${this.meta.prefix} §cСтраница заблокирована.`
                        );
                    case AUTHORIZATION_FAILED:
                    default:
                        this.proxy.client.context.send(
                            `${this.meta.prefix} §cПроизошла ошибка при авторизации.`
                        );

                        return console.log(error);
                }

                this.auth();
            });

        this.authStarted = false;
    }

    private onCaptcha({ src }: ICallbackServiceCaptchaPayload, retry: CallbackServiceRetry): void {
        this.proxy.client.context.questionBuilder()
            .setQuestions(
                new RawJSONBuilder()
                    .setTranslate({
                        translate: `${this.meta.prefix} Введите код с %s.`,
                        with: [
                            new RawJSONBuilder()
                                .setText({
                                    text: "изображения",
                                    underlined: true,
                                    clickEvent: {
                                        action: ClickAction.OPEN_URL,
                                        value: src
                                    },
                                    hoverEvent: {
                                        action: "show_text",
                                        value: new RawJSONBuilder()
                                            .setText("§7Нажмите, чтобы открыть изображение.")
                                    }
                                })
                        ]
                    })
            )
            .onCancel(this.onCancel(retry))
            .build()
            .then(([code]) => retry(code));
    }

    private onTwoFactor({ type, phoneMask }: ICallbackServiceTwoFactorPayload, retry: CallbackServiceRetry): void {
        const builder = this.proxy.client.context.questionBuilder()
            .onCancel(this.onCancel(retry));

        switch (type) {
            case "app":
                builder.setQuestions(`${this.meta.prefix} Введите код из личного сообщения от Администрации или из приложения для генерации кодов, чтобы подтвердить, что Вы владелец страницы.`);
                break;
            case "sms":
                builder.setQuestions(`${this.meta.prefix} Чтобы подтвердить, что Вы являетесь владельцем страницы, введите последние 4 цифры номера, с которого поступил звонок-сброс на Ваш телефон ${phoneMask}.`);
                break;
        }

        builder.build()
            .then(([code]) => retry(code));
    }

    private onCancel(retry: CallbackServiceRetry): VoidFunction {
        return () => {
            retry(
                new Error("Authorization canceled by user.")
            );
        };
    }

    private send(peer_id: number, message: string) {
        this.vk.api.messages.send({
            peer_id,
            message,
            random_id: getRandomId()
        })
            .then(() => {
                this.proxy.client.context.send(`${this.meta.prefix} Сообщение отправлено.`);
            })
            .catch((error) => {
                const { code } = error;

                switch (code) {
                    case PARAM:
                        this.proxy.client.context.send(`${this.meta.prefix} §cОдин из параметров неверный! Проверьте правильность ввода и попробуйте снова.`);

                        break;
                    case MESSAGES_USER_BLOCKED:
                        return this.proxy.client.context.send(`${this.meta.prefix} §cНельзя отправлять сообщения пользователю, который находится в чёрном списке.`);
                    case MESSAGES_DENY_SEND:
                        return this.proxy.client.context.send(`${this.meta.prefix} §cПользователь добавил вас в чёрный список.`);
                    case MESSAGES_PRIVACY:
                        return this.proxy.client.context.send(`${this.meta.prefix} §cПользователь ограничил круг лиц, которые могут ему написать.`);
                    case MESSAGES_CHAT_USER_NO_ACCESS:
                        return this.proxy.client.context.send(`${this.meta.prefix} §cУ вас нет доступа к этому чату!`);
                    default:
                        this.proxy.client.context.send(`${this.meta.prefix} §cПроизошла ошибка при отправке сообщения.`);

                        break;
                }

                console.log(error);
            });
    }

    private clearCredentials() {
        this.updateConfig({
            token: "",
            user: 0
        });
    }

    stop(): void {
        this.stopNotificationsUpdates();
        this.vk.updates.stop();
    }
}
