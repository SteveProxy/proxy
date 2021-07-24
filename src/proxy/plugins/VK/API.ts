import { VK as _VK, MessageContext } from 'vk-io';

import { IProfile, MultipleResource } from '../../../interfaces';
import { GroupsGroupFull, MessagesConversation } from 'vk-io/lib/api/schemas/objects';

export class VK extends _VK {

    private profilesCache: Map<number, (IProfile | GroupsGroupFull) | MessagesConversation> = new Map();
    private conservationsCache: Map<number, MessagesConversation> = new Map();

    async getByMultipleId(context: MessageContext | number): Promise<MultipleResource> {
        if (typeof context === 'number') {
            context = {
                senderId: context,
                peerId: context,
                isUser: true
            } as MessageContext;
        }

        const profilesCache = this.profilesCache;

        const hasUserInCache = profilesCache.has(context.senderId);

        const profile = !hasUserInCache ?
            context.isUser ?
                await this.api.users.get({
                    user_ids: String(context.senderId)
                })
                    .then(([{ first_name, last_name }]) => ({
                        name: `${first_name} ${last_name}`
                    }))
                :
                await this.api.groups.getById({
                    group_id: String(Math.abs(context.senderId))
                })
                    .then(([group]) => group)
            :
            profilesCache.get(context.senderId) as IProfile | GroupsGroupFull;

        if (!hasUserInCache) {
            profilesCache.set(context.senderId, profile);
        }

        const conservationsCache = this.conservationsCache;

        const hasConservationInCache = conservationsCache.has(context.peerId);

        const conservation = !hasConservationInCache ?
            await this.api.messages.getConversationsById({
                peer_ids: context.peerId
            })
                .then(({ items: [conservation] }) => conservation)
            :
            conservationsCache.get(context.peerId) as MessagesConversation;

        if (!hasConservationInCache) {
            conservationsCache.set(context.peerId, conservation);
        }

        return {
            ...profile,
            ...conservation
        };
    }
}
