import { RawJSONBuilder } from "rawjsonbuilder";

import { Item } from "../../../../../proxy/modules/pagesBuilder/components/Item";

export interface IPlayerHeadOptions {
    name?: RawJSONBuilder;
    lore?: RawJSONBuilder[];
    onClick?: Item["onClick"];
    position?: Item["position"];
    value?: string;
    url?: string;
}