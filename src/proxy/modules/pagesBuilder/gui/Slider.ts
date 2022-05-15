import { NBT, Item } from '../components';

import { minecraftData } from '../../../../utils';
import { IItemConstructor } from '../types';

export interface ISliderOptions {
    cellsCount: number;
    initialPosition: number;
    value: number;
    max: number;
    nbt: (value: number) => NBT;
    onClick: (value: number) => unknown;
}

export function Slider({ cellsCount, initialPosition, value, nbt, onClick, max }: ISliderOptions): Item[] {
    const cells = Math.ceil(value / (max / cellsCount));
    let placeholders = cellsCount - cells;

    placeholders = placeholders >= 0 ? placeholders : 0;

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
                    id: minecraftData.itemsByName['lime_stained_glass_pane'].id,
                    position: initialPosition + index as IItemConstructor['position'],
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
                    id: minecraftData.itemsByName['gray_stained_glass_pane'].id,
                    position: initialPosition + index as IItemConstructor['position'],
                    nbt,
                    onClick: () => onClick(CELL_VALUE)
                });
            })
    ];
}
