import { createServer } from 'minecraft-protocol';

import { config } from './config';

import { getVersion, LOBBY_LOGIN_PACKET } from './utils';

const { proxy, lobby: _lobby, bridge: { title } } = config.data!;

const lobby = createServer({
    ...proxy,
    ..._lobby
});

lobby.on('login', (client) => {
    client.write('login', LOBBY_LOGIN_PACKET);
    client.write('position', {
        x: 0,
        y: 64,
        z: 0,
        yaw: 0,
        pitch: 0,
        flags: 0x00
    });

    const channel = client.protocolVersion >= getVersion('1.13-pre3') ?
        'brand'
        :
        'MC|Brand';

    client.registerChannel(channel, ['string', []]);
    client.writeChannel(channel, title);
});
