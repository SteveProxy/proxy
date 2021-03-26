import { createServer } from "minecraft-protocol";

import { config } from "./config";
import { getVersion, minecraftData } from "./utils";

const { proxy, lobby: _lobby, bridge: { title } } = config;

const lobby = createServer({
    ...proxy,
    ..._lobby
});

// @ts-ignore Invalid lib types
const loginPacket = minecraftData.loginPacket;

lobby.on("login", (client) => {
    client.write("login", { // @ts-ignore Invalid lib types
        entityId: client.id,
        isHardcore: true,
        gameMode: 0,
        previousGameMode: 255,
        worldNames: loginPacket.worldNames,
        dimensionCodec: loginPacket.dimensionCodec,
        dimension: loginPacket.dimension,
        worldName: "minecraft:overworld",
        hashedSeed: [0, 0],
        viewDistance: 10,
        reducedDebugInfo: false,
        enableRespawnScreen: true,
        isDebug: false,
        isFlat: false
    });

    const channel = client.protocolVersion >= getVersion("1.13-pre3") ? "brand" : "MC|Brand";

    client.registerChannel(channel, ["string", []]);
    client.writeChannel(channel, title);

    client.write("position", {
        x: 0,
        y: 64,
        z: 0,
        yaw: 0,
        pitch: 0,
        flags: 0x00
    });
});
