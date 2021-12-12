import { versions } from 'minecraft-data';

type VersionOrProtocol<V extends string | number> = V extends string ? number : string;

export function getVersion<V extends string | number>(version: V): VersionOrProtocol<V> {
    const isString = typeof version === 'string';

    const [versionObject] = versions.pc.filter((versionObject) => (
        versionObject[isString ? 'minecraftVersion' : 'version'] === version
    ));

    return versionObject[isString ? 'version' : 'minecraftVersion'] as VersionOrProtocol<V>;
}
