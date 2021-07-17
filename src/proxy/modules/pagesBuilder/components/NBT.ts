import { BaseComponent, ComponentsUnion } from "rawjsonbuilder";

import { NBTType } from "../../../../interfaces";

export class NBT {

    type: NBTType;
    value: any;
    name?: "";

    constructor(type: NBTType, value: any | ComponentsUnion) {
        this.type = type;

        switch (type) {
            case "string":
                if (Array.isArray(value)) {
                    value = value.map(this.toString);
                } else {
                    value = this.toString(value);
                }
                break;
        }

        this.value = value;
    }

    build(): this {
        this.name = "";

        return this;
    }

    private toString(value: any | ComponentsUnion): string {
        if (typeof value === "object") {
            if (value instanceof BaseComponent) {
                return value.toString();
            }

            return JSON.stringify(value);
        }

        return value;
    }
}
