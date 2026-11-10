import type { CountryCard, RawCountry } from "./types.js";

const formatCurrency = ({
  name,
  symbol,
}: NonNullable<RawCountry["currencies"]>[number]): string =>
  symbol ? `${name} (${symbol})` : name;

export const mapCountryResponse = (raw: RawCountry): CountryCard => ({
  name: raw.name,
  nativeName: raw.nativeName ?? null,
  demonym: raw.demonym ?? null,
  flagUrl: raw.flags?.svg ?? raw.flags?.png ?? null,
  flagEmoji: raw.flag ?? "",
  capital: raw.capital ?? null,
  region: raw.region ?? "",
  subregion: raw.subregion ?? null,
  population: raw.population ?? 0,
  area: raw.area ?? null,
  borders: [...(raw.borders ?? [])],
  languages: (raw.languages ?? []).map((language) => language.name),
  currencies: (raw.currencies ?? []).map(formatCurrency),
});
