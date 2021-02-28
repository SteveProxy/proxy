import { Item } from "../components/Item";

import { minecraftData } from "../../../../utils";

import { ISliderOptions } from "../../../../interfaces";

export function Slider({ cellsCount, initialPosition, value, nbt, onClick, max }: ISliderOptions): Item[] {
    const cells = Math.ceil(value / (max / cellsCount));
    const placeholders = cellsCount - cells;

    const getNBT = (index: number) => {
        index += 1;

        const CELL_VALUE = Math.trunc(index / cellsCount * max);

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
                    id: minecraftData.findItemOrBlockByName("lime_stained_glass_pane").id,
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
                    id: minecraftData.findItemOrBlockByName("gray_stained_glass_pane").id,
                    position: initialPosition + index,
                    nbt,
                    onClick: () => onClick(CELL_VALUE)
                });
            })
    ];
}