export interface IPlayer {
    uuid: string;
    username: string;
    username_history: IUsernameHistory[];
    textures: {
        custom: boolean;
        slim: boolean;
        skin: {
            url: string;
            data: string;
        };
        raw: {
            value: string;
            signature: string;
        };
    };
    created_at: string | null;
}

export interface IUsernameHistory {
    username: string;
    changed_at?: string;
}
