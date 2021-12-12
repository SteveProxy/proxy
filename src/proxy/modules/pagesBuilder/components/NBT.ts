import { BaseComponent, ComponentsUnion } from 'rawjsonbuilder';

import { NBTType } from '../types';

export class NBT {

    type: NBTType;
    value: any;
    name = '';

    constructor(type: NBTType, value: any | ComponentsUnion) {
        this.type = type;

        switch (type) {
            case 'string':
                if (Array.isArray(value)) {
                    value = value.map(this.toString);
                } else {
                    value = this.toString(value);
                }
                break;
        }

        this.value = value;
    }

    static byte(value: NBT['value']): NBT {
        return new NBT(NBTType.BYTE, value);
    }

    static short(value: NBT['value']): NBT {
        return new NBT(NBTType.SHORT, value);
    }

    static int(value: NBT['value']): NBT {
        return new NBT(NBTType.INT, value);
    }

    static long(value: NBT['value']): NBT {
        return new NBT(NBTType.LONG, value);
    }

    static float(value: NBT['value']): NBT {
        return new NBT(NBTType.FLOAT, value);
    }

    static double(value: NBT['value']): NBT {
        return new NBT(NBTType.DOUBLE, value);
    }

    static byteArray(value: NBT['value']): NBT {
        return new NBT(NBTType.BYTE_ARRAY, value);
    }

    static string(value: NBT['value']): NBT {
        return new NBT(NBTType.STRING, value);
    }

    static list(value: NBT['value']): NBT {
        return new NBT(NBTType.LIST, value);
    }

    static compound(value: NBT['value']): NBT {
        return new NBT(NBTType.COMPOUND, value);
    }

    static intArray(value: NBT['value']): NBT {
        return new NBT(NBTType.INT_ARRAY, value);
    }

    static longArray(value: NBT['value']): NBT {
        return new NBT(NBTType.LONG_ARRAY, value);
    }

    private toString(value: any | ComponentsUnion): string {
        if (typeof value === 'object') {
            if (value instanceof BaseComponent) {
                return value.toString();
            }

            return JSON.stringify(value);
        }

        return value;
    }
}
