import type { CountryCard } from "../logic/types.js";
import { el } from "./dom.js";

export const renderFlag = (country: CountryCard, className: string) =>
  country.flagUrl
    ? el("img", {
        className,
        src: country.flagUrl,
        alt: `Флаг: ${country.name}`,
        loading: "lazy",
      })
    : el("span", {
        className: `${className} flag-fallback`,
        textContent: country.flagEmoji,
        ariaHidden: "true",
      });
