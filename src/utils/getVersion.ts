import { versions } from 'minecraft-data';

export function getVersion(version: string | number): number | string {
    const versionObject = versions.pc.filter((versionObject) => versionObject[
        typeof version === 'string' ?
            'minecraftVersion'
            :
            'version'
    ] === version)[0];

    return versionObject[
        typeof version === 'string' ?
            'version'
            :
            'minecraftVersion'
    ] as number | string;
}
