import { nameRegExp } from '../utils';

export function isValidNickname(nickname: string): boolean {
    return Boolean(
        nickname
            .match(nameRegExp)
    );
}
