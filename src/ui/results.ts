import type { SearchState } from "../logic/search.js";
import type { CountryCard } from "../logic/types.js";
import { renderCard } from "./card.js";
import { el } from "./dom.js";
import { describeError } from "./format.js";

export const renderResults = (
  state: SearchState,
  handlers: {
    onOpen: (country: CountryCard) => void;
    onRetry: () => void;
  },
): HTMLElement[] => {
  switch (state.status) {
    case "idle":
      return [
        el(
          "div",
          { className: "placeholder" },
          el("span", {
            className: "placeholder-icon",
            ariaHidden: "true",
            textContent: "\u{1F30D}",
          }),
          el("p", {
            className: "hint",
            textContent: "Начните вводить название страны.",
          }),
        ),
      ];
    case "loading":
      return [
        el(
          "p",
          { className: "loading" },
          el("span", { className: "spinner", ariaHidden: "true" }),
          `Ищем «${state.query}»…`,
        ),
      ];
    case "empty":
      return [
        el(
          "div",
          { className: "empty" },
          el("span", {
            className: "placeholder-icon",
            ariaHidden: "true",
            textContent: "\u{1F50E}",
          }),
          el("p", {
            className: "empty-title",
            textContent: `Ничего не найдено по запросу «${state.query}»`,
          }),
          el("p", {
            className: "hint",
            textContent: "Попробуйте другое название или английское написание.",
          }),
        ),
      ];
    case "error":
      return [
        el(
          "div",
          { className: "error", role: "alert" },
          el("p", { textContent: describeError(state.error) }),
          el("button", {
            type: "button",
            textContent: "Повторить",
            onclick: handlers.onRetry,
          }),
        ),
      ];
    case "results":
      return [
        el(
          "ul",
          { className: "cards" },
          ...state.countries.map((country) =>
            renderCard(country, handlers.onOpen),
          ),
        ),
      ];
  }
};
