import { ClickAction, Component, HoverAction, text } from 'rawjsonbuilder';

import { PluginManager } from './PluginManager';

import { Proxy } from '../Proxy';
import { CancelHandler, IAnswer, Middleware, Question, QuestionItem, QuestionMessage, QuestionSet, QuestionValidator } from '../../interfaces';
import { PacketContext } from './packetManager/PacketContext';

let currentBuilder: QuestionBuilder | undefined;

export class QuestionBuilder {

    readonly proxy: Proxy;
    static prefix = 'questionbuilder';

    private questions: QuestionSet = new Set();
    private answers: string[] = [];
    private paginationFormat = '%c §7/§r %m';
    private cancelHandler: CancelHandler = null;
    private currentQuestion = 1;
    private validationStarted = false;

    private questionResolver?: (answer: IAnswer) => void;

    constructor(proxy: Proxy) {
        this.proxy = proxy;
    }

    setQuestions(questions: Question): this {
        this.questions = new Set(
            this.convertQuestions(questions)
        );

        this.saveContext();

        return this;
    }

    addQuestions(questions: Question): this {
        this.convertQuestions(questions)
            .forEach((question) => (
                this.questions.add(question)
            ));

        this.saveContext();

        return this;
    }

    private convertQuestions(questions: Question): [QuestionMessage, QuestionValidator][] {
        if (!Array.isArray(questions)) {
            questions = [[questions]];
        }

        return (questions as QuestionItem[]).map((questionItem) => {
            if (!Array.isArray(questionItem)) {
                questionItem = [questionItem];
            }

            let question = questionItem[0];
            const validator = questionItem[1];

            if (typeof question === 'string') {
                question = text(question);
            }

            return [question, validator];
        });
    }

    setPaginationFormat(format: string): this {
        this.paginationFormat = format;

        this.saveContext();

        return this;
    }

    onCancel(handler: CancelHandler): this {
        this.cancelHandler = handler;

        return this;
    }

    private async sendQuestion() {
        if (currentBuilder && this.currentQuestion <= this.questions.size) {
            const questions = [...this.questions];
            const questionIndex = this.currentQuestion - 1;
            const question = questions[questionIndex];

            const message = question[0];
            const validator = question[1];

            const builder = text('')
                .addNewLine()
                .addExtra(message)
                .addNewLine()
                .addNewLine();

            if (this.currentQuestion > 1) {
                builder.addExtra(
                    text('◀')
                        .setClickEvent({
                            action: ClickAction.RUN_COMMAND,
                            value: `${PluginManager.prefix}${QuestionBuilder.prefix} back`
                        })
                        .setHoverEvent({
                            action: HoverAction.SHOW_TEXT,
                            value: text('Нажмите, чтобы вернуться к предыдущему вопросу.', 'gray')
                        })
                        .addExtra(` ${Component.BULLET} `)
                );
            }

            if (this.paginationFormat) {
                const pagination = this.paginationFormat
                    .replace('%c', String(this.currentQuestion))
                    .replace('%m', String(this.questions.size));

                builder.addExtra(`${pagination}§r`)
                    .addExtra(` ${Component.BULLET} `);
            }

            builder.addExtra(
                text('Отмена', 'red')
                    .setBold()
                    .setUnderlined()
                    .setClickEvent({
                        action: ClickAction.RUN_COMMAND,
                        value: `${PluginManager.prefix}${QuestionBuilder.prefix} cancel`
                    })
                    .setHoverEvent({
                        action: HoverAction.SHOW_TEXT,
                        value: text('§7Нажмите, чтобы отменить ввод.')
                    })
            )
                .addNewLine();

            this.proxy.client.context.send(builder);

            await new Promise<IAnswer>((resolve) => {
                this.questionResolver = resolve;

                this.saveContext();
            })
                .then(async ({ answer, skipValidation }) => {
                    if (validator && !skipValidation) {
                        this.validationStarted = true;
                        this.saveContext();

                        const success = await validator(answer);

                        this.validationStarted = false;

                        if (!success) {
                            this.currentQuestion--;
                        }
                    }

                    this.currentQuestion++;
                    this.saveContext();

                    this.answers[questionIndex] = answer;
                });

            await this.sendQuestion();
        }
    }

    private saveContext(): void {
        currentBuilder = this;
    }

    async build(): Promise<string[]> {
        if (!this.questions.size) {
            throw new Error('Questions not set.');
        }

        await this.sendQuestion();

        this.stop();

        return this.answers;
    }

    stop(): void {
        QuestionBuilder.stop();
    }

    static stop(): void {
        currentBuilder = undefined;
    }

    static get middleware(): Middleware {
        return (context: PacketContext) => {
            const prefix = `${PluginManager.prefix}${QuestionBuilder.prefix}`;
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
                    case 'back': {
                        if (currentBuilder.validationStarted) {
                            return currentBuilder.proxy.client.context.send(
                                `${currentBuilder.proxy.config.bridge.title} | §cДождитесь окончания проверки, перед возвратом к предыдущему вопросу!`
                            );
                        }

                        const currentQuestion = currentBuilder.currentQuestion;

                        if (currentQuestion !== 1) {
                            currentBuilder.currentQuestion = currentQuestion - 2;
                        }

                        skipValidation = true;

                        break;
                    }
                    case 'cancel':
                        if (currentBuilder.cancelHandler) {
                            currentBuilder.cancelHandler();
                        }

                        return currentBuilder.stop();
                }

                context.setCanceled();

                if (currentBuilder.questionResolver) {
                    currentBuilder.questionResolver({
                        answer: context.packet.message,
                        skipValidation
                    });
                }
            }
        };
    }
}
