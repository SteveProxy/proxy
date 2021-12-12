import { PacketContext } from '../../packetManager';

import { IItem } from '../../context';
import { IItemConstructor } from '../types';

export class Item {

    itemId: number;
    itemDamage?: number;
    itemCount: IItemConstructor['count'];
    nbtData?: any;

    position: IItemConstructor['position'];
    onClick?: (context: PacketContext) => void;

    constructor(params: IItemConstructor) {
        const { id, damage, position, count = 1, nbt, onClick } = params;

        this.itemId = id;
        this.itemDamage = damage;
        this.itemCount = count;
        this.nbtData = nbt;
        this.position = position;
        this.onClick = onClick;
    }

    toJSON(): IItem {
        return {
            present: true,
            itemId: this.itemId,
            itemDamage: this.itemDamage,
            itemCount: this.itemCount,
            nbtData: this.nbtData
        };
    }
}
