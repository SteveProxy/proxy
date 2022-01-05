export interface IXboxLiveAuthResponse {
    IssueInstant: string;
    NotAfter: string;
    Token: string;
    DisplayClaims: {
        xui: {
            uhs: string;
        }[];
    };
}

export interface IXboxLiveAuthErrorResponse {
    Identity: string;
    XErr: XboxLiveAuthError;
    Message: string;
    Redirect: string;
}

export enum XboxLiveAuthError {
    NOT_EXIST = 2148916233,
    COUNTRY_UNAVAILABLE = 2148916235,
    CHILD = 2148916238
}

export interface IMinecraftAuthResponse {
    username: string;
    roles: string[];
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface IMinecraftProfileResponse {
    id: string,
    name: string,
    skins: {
        id: string,
        state: string,
        url: string,
        variant: string,
        alias: string
    }[],
    capes: {
        id: string,
        url: string
    }[];
}
