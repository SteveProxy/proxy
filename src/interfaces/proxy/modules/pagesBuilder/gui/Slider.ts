import { NBT } from "../../../../../proxy/modules/pagesBuilder/components/NBT";

export interface ISliderOptions {
    cellsCount: number;
    initialPosition: number;
    value: number;
    max: number;
    nbt: (value: number) => NBT;
    onClick: (value: number) => unknown;
}