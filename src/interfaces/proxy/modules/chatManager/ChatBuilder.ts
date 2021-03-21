import { RawJSONBuilder } from "rawjsonbuilder";

export interface ITrigger {
    name: string;
    callback: () => unknown;
}

export type TriggersMap = Map<ITrigger["name"], ITrigger["callback"]>;

export type StringPage = string;
export type RawJSONPage = RawJSONBuilder;
export type FunctionPage = () => StringPage | RawJSONPage;

export type Page = StringPage | RawJSONPage | FunctionPage;

export interface IResetListenTimeoutOptions {
    isFirstBuild?: boolean;
}

export type Button = StringButton | ObjectButton;

export type DefaultButtonLabel = "⏪" | "◀" | "⏹" | "▶" | "⏩";
export type StringButton = "first" | "back" | "stop" | "next" | "last";
export type ObjectButton = {
    [key in StringButton]: string
};
export type DefaultTextButtonsMap = Map<StringButton, DefaultButtonLabel>;

interface IAutoGeneratePagesOptions {
    items: RawJSONBuilder[];
    chunkSize?: number;
}

export type AutoGeneratePagesOptions = IAutoGeneratePagesOptions["items"] | IAutoGeneratePagesOptions;