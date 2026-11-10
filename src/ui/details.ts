import type { CountryCard } from "../logic/types.js";
import { el } from "./dom.js";
import { renderFlag } from "./flag.js";
import { formatNumber } from "./format.js";

const listOrDash = (items: readonly string[]) =>
  items.length > 0 ? items.join(", ") : "—";

const row = (label: string, value: string) =>
  el(
    "div",
    { className: "row" },
    el("dt", { textContent: label }),
    el("dd", { textContent: value }),
  );

export const createDetailsDialog = () => {
  const dialog = el("dialog", { className: "details" });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  const open = (country: CountryCard) => {
    const region = [country.region, country.subregion]
      .filter((part): part is string => Boolean(part))
      .join(" / ");
    dialog.replaceChildren(
      el(
        "div",
        { className: "details-head" },
        renderFlag(country, "flag flag-large"),
        el(
          "div",
          {},
          el("h2", { textContent: country.name }),
          el("p", {
            className: "muted",
            textContent: country.nativeName ?? "",
          }),
        ),
        el("button", {
          type: "button",
          className: "close",
          textContent: "×",
          ariaLabel: "Закрыть",
          onclick: () => dialog.close(),
        }),
      ),
      el(
        "dl",
        {},
        row("Столица", country.capital ?? "—"),
        row("Регион", region || "—"),
        row("Население", formatNumber(country.population)),
        row(
          "Площадь",
          country.area === null ? "—" : `${formatNumber(country.area)} км²`,
        ),
        row("Жители", country.demonym ?? "—"),
        row("Языки", listOrDash(country.languages)),
        row("Валюты", listOrDash(country.currencies)),
        row("Границы", listOrDash(country.borders)),
      ),
    );
    if (!dialog.open) dialog.showModal();
  };

  return { element: dialog, open };
};
