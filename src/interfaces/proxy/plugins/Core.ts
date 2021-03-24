import { NBT } from "../../../proxy/modules/pagesBuilder/components/NBT";

export interface IRawServer {
    name: NBT;
    ip: NBT;
    icon: NBT;
}

export interface IServer {
    name: string;
    ip: string;
    icon: string;
}