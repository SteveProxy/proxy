import { ComponentsUnion } from 'rawjsonbuilder';

export type Page = StringPage | RawJSONPage | FunctionPage;

export type StringPage = string;
export type RawJSONPage = ComponentsUnion;
export type FunctionPage = () => (StringPage | RawJSONPage);

export type ButtonUnion = Button | {
    [key in Button]: string
};

export enum Button {
    FIRST = 'first',
    BACK = 'back',
    STOP = 'stop',
    NEXT = 'next',
    LAST = 'last'
}

export type DefaultButtonLabel = '⏪' | '◀' | '⏹' | '▶' | '⏩';

export type AutoGeneratePagesOptions = ComponentsUnion[] | {
    items: ComponentsUnion[];
    chunkSize?: number;
};

export interface ITrigger {
    name: string;
    callback: () => unknown;
}
