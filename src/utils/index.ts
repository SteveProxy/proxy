import moment from 'moment';

import 'moment/locale/ru';

moment.locale('ru');

moment.relativeTimeThreshold('s', 60);
moment.relativeTimeThreshold('ss', 0);
moment.relativeTimeThreshold('m', 60);
moment.relativeTimeThreshold('h', 24);
moment.relativeTimeThreshold('d', 31);
moment.relativeTimeThreshold('M', 12);
moment.relativeTimeThreshold('y', 365);

export * from './constants';
export * from './escapeFormatting';
export * from './formatBytes';
export * from './generateRandomString';
export * from './getCurrentTime';
export * from './getVersion';
export * from './humanizeDate';
export * from './isValidIP';
export * from './isValidNickname';
export * from './normalizeDuartion';
export * from './pad';
export * from './parseIP';
export * from './randomInteger';
export * from './serializeIP';

export type ValuesOf<T extends readonly any[]> = T[number];
