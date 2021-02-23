import { NBTType } from "../../../interfaces";

export class NBT {

    type: NBTType;
    value: any;
    name?: "";

    constructor(type: NBTType, value: any) {
        this.type = type;
        this.value = value;
    }

    build(): this {
        this.name = "";

        return this;
    }
}
