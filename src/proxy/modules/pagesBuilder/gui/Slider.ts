import { Item } from "../components/Item";

import { ISliderOptions } from "../../../../interfaces";

export function Slider({ cellsCount, initialPosition, value, nbt, onClick }: ISliderOptions): Item[] {
    const cells = Math.ceil(value / (100 / cellsCount));
    const placeholders = cellsCount - cells;

    const getNBT = (index: number) => {
        index += 1;

        const CELL_VALUE = Math.trunc(index / cellsCount * 100);

        return {
            nbt: nbt(CELL_VALUE),
            CELL_VALUE
        };
    };

    return [
        ...new Array(cells)
            .fill(null)
            .map((_, index) => {
                const { nbt, CELL_VALUE } = getNBT(index);

                return new Item({
                    id: 400,
                    position: initialPosition + index,
                    nbt,
                    onClick: () => onClick(CELL_VALUE)
                });
            }),
        ...new Array(placeholders)
            .fill(null)
            .map((_, index) => {
                index += cells;

                const { nbt, CELL_VALUE } = getNBT(index);

                return new Item({
                    id: 402,
                    position: initialPosition + index,
                    nbt,
                    onClick: () => onClick(CELL_VALUE)
                });
            })
    ];
}