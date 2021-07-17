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
    // @ts-ignore Invalid lib types
    loginPacket.entityId = client.id;
    loginPacket.isHardcore = true;
    loginPacket.gameMode = 0;
    loginPacket.dimension.value.infiniburn.value = "minecraft:infiniburn_end";
    loginPacket.dimension.value.effects.value = "minecraft:the_end";

    client.write("login", loginPacket);

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
