export interface ISpotify {
    code: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    username: string;
    market: string;
    clientId: string;
    clientSecret: string;
    redirectUrl: string;
    template: {
        explicit: string;
        // %e - explicit, %n - name, %a - artists, %p - progress, %d - duration
        output: string;
    };
}
