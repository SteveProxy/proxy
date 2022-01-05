import fs from 'fs';

import { USERS_DATA_PATH } from './utils';

import './server';
import './lobby';

console.log('[Steve] Starting...');

if (!fs.existsSync(USERS_DATA_PATH)) {
    fs.mkdirSync(USERS_DATA_PATH);
}
