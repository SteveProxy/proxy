import { createServer } from "minecraft-protocol";

import { NBT } from "./proxy/modules";

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
        dimension: new NBT("compound", {
            infiniburn: new NBT("string", "minecraft:infiniburn_end"),
            effects: new NBT("string", "minecraft:the_end"),
            ultrawarm: new NBT("byte", 0),
            logical_height: new NBT("int", 256),
            natural: new NBT("byte", 0),
            bed_works: new NBT("byte", 0),
            fixed_time: new NBT("long", [0, 6000]),
            coordinate_scale: new NBT("double", 1),
            piglin_safe: new NBT("byte", 0),
            has_skylight: new NBT("byte", 0),
            has_ceiling: new NBT("byte", 0),
            ambient_light: new NBT("float", 0),
            has_raids: new NBT("byte", 1),
            respawn_anchor_works: new NBT("byte", 0)
        })
            .build(),
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
