import lowdb from "lowdb";
import FileSync from "lowdb/adapters/FileSync";

import { IConfig } from "./interfaces";

const adapter = new FileSync<IConfig>("./config.json");

export const db = lowdb(adapter);
