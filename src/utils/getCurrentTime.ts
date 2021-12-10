import { pad } from './pad';

export function getCurrentTime(): string {
    const date = new Date();

    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
