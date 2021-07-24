import { ComponentsUnion } from 'rawjsonbuilder';

import { Item } from '../../../../../proxy/modules';

export interface IPlayerHeadOptions {
    name?: ComponentsUnion;
    lore?: ComponentsUnion[];
    onClick?: Item['onClick'];
    position?: Item['position'];
    value?: string;
    url?: string;
}