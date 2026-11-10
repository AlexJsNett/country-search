import { el } from "./dom.js";

export const renderHistory = (
  history: readonly string[],
  onPick: (query: string) => void,
): HTMLElement =>
  el(
    "ul",
    { className: "history", ariaLabel: "История запросов" },
    ...history.map((query) =>
      el(
        "li",
        {},
        el("button", {
          type: "button",
          className: "chip",
          textContent: query,
          onclick: () => onPick(query),
        }),
      ),
    ),
  );
