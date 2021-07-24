import { NBT } from '../../../proxy/modules';

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