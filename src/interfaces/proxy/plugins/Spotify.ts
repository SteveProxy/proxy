export interface ISpotify {
    code: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string[];
    username: string;
    market: string;
    clientId: string;
    redirectUrl: string;
    template: {
        explicit: string;
        // %e - explicit, %n - name, %a - artists, %p - progress, %d - duration
        output: string;
    };
}
