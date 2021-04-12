import { RawJSONBuilder } from "rawjsonbuilder";

import { PluginManager } from "./PluginManager";

import { bullet, separator } from "./chatManager/components";

import { Proxy } from "../Proxy";
import { IAnswer, Middleware, Question, QuestionItem, QuestionMessage, QuestionSet, QuestionValidator } from "../../interfaces";
import { PacketContext } from "./packetManager/PacketContext";

let currentBuilder: QuestionBuilder | undefined;

export class QuestionBuilder {

    readonly proxy: Proxy;
    static prefix = "questionbuilder";

    private questions: QuestionSet = new Set();
    private answers: string[] = [];
    private paginationFormat = "%c §7/§r %m";
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
            .forEach((question) => this.questions.add(question));

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

            if (typeof question === "string") {
                question = new RawJSONBuilder()
                    .setText(question);
            }

            return [question, validator];
        });
    }

    setPaginationFormat(format: string): this {
        this.paginationFormat = format;

        this.saveContext();

        return this;
    }

    private async sendQuestion() {
        if (currentBuilder && this.currentQuestion <= this.questions.size) {
            const questions = [...this.questions];
            const questionIndex = this.currentQuestion - 1;
            const question = questions[questionIndex];

            const message = question[0];
            const validator = question[1];

            this.proxy.client.context.send(
                new RawJSONBuilder()
                    .setExtra([
                        separator,
                        message,
                        separator,
                        separator,
                        ...(
                            this.currentQuestion > 1 ?
                                [
                                    new RawJSONBuilder()
                                        .setText({
                                            text: "◀",
                                            clickEvent: {
                                                action: "run_command",
                                                value: `${PluginManager.prefix}${QuestionBuilder.prefix} back`
                                            },
                                            hoverEvent: {
                                                action: "show_text",
                                                value: new RawJSONBuilder()
                                                    .setText("§7Нажмите, чтобы вернуться к предыдущему вопросу.")
                                            }
                                        }),
                                    bullet
                                ]
                                :
                                []
                        ),
                        ...(
                            this.paginationFormat ?
                                [
                                    new RawJSONBuilder()
                                        .setText(`${
                                            this.paginationFormat.replace("%c", String(this.currentQuestion))
                                                .replace("%m", String(this.questions.size))
                                        }§r`),
                                    bullet
                                ]
                                :
                                []
                        ),
                        new RawJSONBuilder()
                            .setText({
                                text: "Отмена",
                                color: "red",
                                bold: true,
                                underlined: true,
                                clickEvent: {
                                    action: "run_command",
                                    value: `${PluginManager.prefix}${QuestionBuilder.prefix} cancel`
                                },
                                hoverEvent: {
                                    action: "show_text",
                                    value: new RawJSONBuilder()
                                        .setText("§7Нажмите, чтобы отменить ввод.")
                                }
                            }),
                        separator
                    ])
            );

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
            throw new Error("Questions not set.");
        }

        await this.sendQuestion();

        this.stop();

        return this.answers;
    }

    stop(): void {
        currentBuilder = undefined;
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
                const [command] = message.replace(prefix, "")
                    .trim()
                    .split(" ");

                switch (command) {
                    case "back": {
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
                    case "cancel":
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
