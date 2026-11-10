export type RawCountry = {
  readonly name: string;
  readonly flag?: string;
  readonly flags?: { readonly png?: string; readonly svg?: string };
  readonly capital?: string;
  readonly region?: string;
  readonly subregion?: string;
  readonly population?: number;
  readonly area?: number;
  readonly borders?: readonly string[];
  readonly languages?: readonly { readonly name: string }[];
  readonly currencies?: readonly {
    readonly name: string;
    readonly symbol?: string;
  }[];
  readonly nativeName?: string;
  readonly demonym?: string;
};

export type CountryCard = {
  readonly name: string;
  readonly nativeName: string | null;
  readonly demonym: string | null;
  readonly flagUrl: string | null;
  readonly flagEmoji: string;
  readonly capital: string | null;
  readonly region: string;
  readonly subregion: string | null;
  readonly population: number;
  readonly area: number | null;
  readonly borders: readonly string[];
  readonly languages: readonly string[];
  readonly currencies: readonly string[];
};
