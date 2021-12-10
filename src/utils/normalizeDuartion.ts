import { pad } from './pad';

export function normalizeDuration(duration: number): string {
    duration /= 1000;

    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    return `${pad(minutes)}:${pad(seconds)}`;
}
