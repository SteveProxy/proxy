export function escapeFormatting(string: string): string {
    return string.replace(/§[\w]/g, '');
}
