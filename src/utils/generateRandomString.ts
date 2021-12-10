export function generateRandomString(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz1234567890';

    let id = '';

    for (let i = 0; i < length; i++) {
        id += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return id;
}
