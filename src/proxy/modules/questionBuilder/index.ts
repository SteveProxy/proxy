import { ClickAction, Component, HoverAction, text } from 'rawjsonbuilder';

import { config } from '../../../config';

import { Proxy, QuestionCommand } from '../../';
import { PluginManager } from '../pluginManager';
import { PacketContext } from '../packetManager';

import { generateRandomString } from '../../../utils';
import {
    CancelHandler,
    IAnswer,
    Question,
    QuestionItem,
    QuestionSet,
    SerializedQuestion
} from './types';

const { bridge } = config.data!;

const buildersStorage = new Map<string, QuestionBuilder>();

export class QuestionBuilder {

    static prefix = 'questionbuilder';

    readonly proxy: Proxy;
    readonly id = generateRandomString(6);

    #questions: QuestionSet = new Set();
    #paginationFormat = '%c §7/§r %m';

    #answers: string[] = [];
    #cancelHandler: CancelHandler = null;
    #currentQuestion = 1;
    #validationStarted = false;
    #questionResolver?: (answer: IAnswer) => void;

    constructor(proxy: Proxy) {
        this.proxy = proxy;
    }

    setQuestions(questions: Question): this {
        this.#questions = new Set(
            this.convertQuestions(questions)
        );

        this.saveContext();

        return this;
    }

    addQuestions(questions: Question): this {
        this.convertQuestions(questions)
            .forEach((question) => (
                this.#questions.add(question)
            ));

        this.saveContext();

        return this;
    }

    private convertQuestions(questions: Question): SerializedQuestion[] {
        if (!Array.isArray(questions)) {
            questions = [[questions]];
        }

        return (questions as QuestionItem[])
            .map((questionItem) => {
                if (!Array.isArray(questionItem)) {
                    questionItem = [questionItem];
                }

                const question = questionItem[0];

                if (typeof question === 'string') {
                    questionItem[0] = text(question);
                }

                return questionItem as SerializedQuestion;
            });
    }

    setPaginationFormat(format: string): this {
        this.#paginationFormat = format;

        this.saveContext();

        return this;
    }

    onCancel(handler: CancelHandler): this {
        this.#cancelHandler = handler;

        return this;
    }

    private async sendQuestion() {
        const currentBuilder = buildersStorage.has(this.proxy.client.uuid);

        if (currentBuilder && this.#currentQuestion <= this.#questions.size) {
            const questions = [...this.#questions];
            const questionIndex = this.#currentQuestion - 1;
            const question = questions[questionIndex];

            const message = question[0];
            const validator = question[1];

            const builder = text('')
                .addNewLine()
                .addExtra(message)
                .addNewLine()
                .addNewLine();

            if (this.#currentQuestion > 1) {
                builder.addExtra(
                    text('◀')
                        .setClickEvent({
                            action: ClickAction.RUN_COMMAND,
                            value: `${PluginManager.prefix}${QuestionBuilder.prefix} ${QuestionCommand.BACK}`
                        })
                        .setHoverEvent({
                            action: HoverAction.SHOW_TEXT,
                            value: text('Нажмите, чтобы вернуться к предыдущему вопросу.', 'gray')
                        })
                        .addExtra(` ${Component.BULLET} `)
                );
            }

            if (this.#paginationFormat) {
                const pagination = this.#paginationFormat
                    .replace('%c', String(this.#currentQuestion))
                    .replace('%m', String(this.#questions.size));

                builder.addExtra(`${pagination}§r`)
                    .addExtra(` ${Component.BULLET} `);
            }

            builder.addExtra(
                text('Отмена', 'red')
                    .setBold()
                    .setUnderlined()
                    .setClickEvent({
                        action: ClickAction.RUN_COMMAND,
                        value: `${PluginManager.prefix}${QuestionBuilder.prefix} ${QuestionCommand.CANCEL}`
                    })
                    .setHoverEvent({
                        action: HoverAction.SHOW_TEXT,
                        value: text('§7Нажмите, чтобы отменить ввод.')
                    })
            )
                .addNewLine();

            this.proxy.client.context.send(builder);

            await new Promise<IAnswer>((resolve) => {
                this.#questionResolver = resolve;

                this.saveContext();
            })
                .then(async ({ answer, skipValidation }) => {
                    if (validator && !skipValidation) {
                        this.#validationStarted = true;
                        this.saveContext();

                        const success = await validator(answer);

                        this.#validationStarted = false;

                        if (!success) {
                            this.#currentQuestion--;
                        }
                    }

                    this.#currentQuestion++;
                    this.saveContext();

                    this.#answers[questionIndex] = answer;
                });

            await this.sendQuestion();
        }
    }

    private saveContext(): void {
        buildersStorage.set(this.proxy.client.uuid, this);
    }

    async build(): Promise<string[]> {
        if (!this.#questions.size) {
            throw new Error('Questions not set.');
        }

        await this.sendQuestion();

        this.stop();

        return this.#answers;
    }

    stop(): void {
        QuestionBuilder.stop(this.proxy.client.uuid);
    }

    static stop(uuid: string): void {
        buildersStorage.delete(uuid);
    }

    static get middleware(): (context: PacketContext) => void {
        return (context: PacketContext) => {
            const prefix = `${PluginManager.prefix}${QuestionBuilder.prefix}`;
            const currentBuilder = buildersStorage.get(context.proxy.client.uuid);
            const message = context.packet.message;

            let skipValidation;

            if (message.startsWith(prefix)) {
                context.setCanceled();
            }

            if (currentBuilder) {
                const [command] = message.replace(prefix, '')
                    .trim()
                    .split(' ');

                switch (command) {
                    case QuestionCommand.BACK: {
                        if (currentBuilder.#validationStarted) {
                            return currentBuilder.proxy.client.context.send(
                                `${bridge.title} | §cДождитесь окончания проверки, перед возвратом к предыдущему вопросу!`
                            );
                        }

                        const currentQuestion = currentBuilder.#currentQuestion;

                        if (currentQuestion !== 1) {
                            currentBuilder.#currentQuestion = currentQuestion - 2;
                        }

                        skipValidation = true;

                        break;
                    }
                    case QuestionCommand.CANCEL:
                        if (currentBuilder.#cancelHandler) {
                            currentBuilder.#cancelHandler();
                        }

                        return currentBuilder.stop();
                }

                context.setCanceled();

                if (currentBuilder.#questionResolver) {
                    currentBuilder.#questionResolver({
                        answer: context.packet.message,
                        skipValidation
                    });
                }
            }
        };
    }
}

export * from './types';
