import { IItem, IItemConstructor /*, RangeOf*/ } from '../../../../interfaces';
import { PacketContext } from '../../packetManager/PacketManager';

export class Item {

    itemId: number;
    itemDamage?: number;
    itemCount: number; // RangeOf<1, 64>
    nbtData?: any;

    position: number; // RangeOf<0, 63>
    onClick?: (context: PacketContext) => void;

    constructor(params: IItemConstructor) {
        const { id, damage, position, count = 1, nbt, onClick } = params;

        this.itemId = id;
        this.itemDamage = damage;
        this.itemCount = count;

        if (nbt) {
            this.nbtData = nbt.build();
        }

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
