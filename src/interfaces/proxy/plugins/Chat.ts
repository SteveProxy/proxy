export interface IDictionary {
    [key: string]: string[];
}

export type EmojiCategory = 'emotions' | 'actions' | 'animals';
export type EmojiCategoriesMap = Map<EmojiCategory, string>;
