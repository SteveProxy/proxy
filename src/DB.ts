import lowdb from "lowdb";
import FileAsync from "lowdb/adapters/FileAsync.js";

import { IConfig } from "./interfaces";

const adapter = new FileAsync<IConfig>("./config.json");

export const db = await lowdb(adapter);
