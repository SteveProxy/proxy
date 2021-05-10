import { RawJSONBuilder } from "rawjsonbuilder";

export const separator = new RawJSONBuilder()
    .setText("\n");

export const bullet = new RawJSONBuilder()
    .setText(" §7•§r ");

export const space = new RawJSONBuilder()
    .setText(" ");
