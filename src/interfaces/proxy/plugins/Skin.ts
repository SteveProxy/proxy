export interface ISkin {
    textureId: string;
    url: string;
    slim: boolean;
    id: string;
    name: string;
    skinImage: string;
    modelImage: string;
    created: string;
    updated: string;
}

export interface IChangeSkinOptions {
    url: ISkin['url'];
    slim: ISkin['slim'];
}