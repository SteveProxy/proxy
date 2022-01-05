import { pad } from './pad';

export function normalizeDuration(duration: number): string {
    duration /= 1_000;
    const seconds = Math.floor(duration % 60);

    duration /= 60;
    const minutes = Math.floor(duration % 60);

    return `${pad(minutes)}:${pad(seconds)}`;
}
