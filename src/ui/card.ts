import type { CountryCard } from "../logic/types.js";
import { el } from "./dom.js";
import { renderFlag } from "./flag.js";
import { formatNumber } from "./format.js";

const row = (label: string, value: string) =>
  el(
    "div",
    { className: "row" },
    el("dt", { textContent: label }),
    el("dd", { textContent: value }),
  );

export const renderCard = (
  country: CountryCard,
  onOpen: (country: CountryCard) => void,
): HTMLElement =>
  el(
    "li",
    {},
    el(
      "button",
      {
        type: "button",
        className: "card",
        onclick: () => onOpen(country),
      },
      renderFlag(country, "flag"),
      el("h3", { textContent: country.name }),
      el(
        "dl",
        {},
        row("Столица", country.capital ?? "—"),
        row("Регион", country.region || "—"),
        row("Население", formatNumber(country.population)),
      ),
    ),
  );
