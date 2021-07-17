import { ComponentsUnion } from "rawjsonbuilder";

export type CancelHandler = ((...params: any) => unknown) | null;

export type RawQuestionMessage = string;
export type QuestionMessage = ComponentsUnion;

export type QuestionValidator = ((answer: string) => boolean | Promise<boolean> | void) | undefined;

export type QuestionItem = [QuestionMessage | RawQuestionMessage] | [QuestionMessage | RawQuestionMessage, QuestionValidator];
export type QuestionSet = Set<[QuestionMessage] | [QuestionMessage, QuestionValidator]>;

export type Question = QuestionMessage | RawQuestionMessage | QuestionItem | (QuestionMessage | RawQuestionMessage | QuestionItem)[];

export interface IAnswer {
    answer: string;
    skipValidation?: boolean;
}
