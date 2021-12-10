export function pad(number: number): string {
    return String(number > 9 ? number : `0${number}`);
}
