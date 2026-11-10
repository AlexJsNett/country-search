import { searchCountries } from "./logic/api.js";
import { createCachedSearch } from "./logic/cache.js";
import {
  addToHistory,
  exactMatchName,
  loadHistory,
  saveHistory,
} from "./logic/history.js";
import { createSearchController, type SearchState } from "./logic/search.js";
import type { CountryCard } from "./logic/types.js";
import { createDetailsDialog } from "./ui/details.js";
import { el } from "./ui/dom.js";
import { renderHistory } from "./ui/history.js";
import { renderResults } from "./ui/results.js";

let history = loadHistory(localStorage);

const details = createDetailsDialog();
const historySlot = el("div", { className: "history-slot" });
const resultsSlot = el("div", {
  className: "results",
  ariaLive: "polite",
});

const input = el("input", {
  type: "text",
  className: "search",
  placeholder: "Введите название страны",
  autocomplete: "off",
  ariaLabel: "Название страны",
});

const controller = createSearchController({
  search: createCachedSearch(searchCountries),
  onState: (state) => {
    renderState(state);
    const name = exactMatchName(state);
    if (name !== null) remember(name);
  },
});

const remember = (name: string) => {
  history = addToHistory(history, name);
  saveHistory(localStorage, history);
  renderHistorySlot();
};

const openCountry = (country: CountryCard) => {
  remember(country.name);
  details.open(country);
};

const renderHistorySlot = () => {
  historySlot.replaceChildren(
    ...(history.length > 0
      ? [
          renderHistory(history, (query) => {
            input.value = query;
            clearButton.hidden = false;
            controller.searchNow(query);
          }),
        ]
      : []),
  );
};

const renderState = (state: SearchState) => {
  resultsSlot.scrollTop = 0;
  resultsSlot.replaceChildren(
    ...renderResults(state, {
      onOpen: openCountry,
      onRetry: controller.retry,
    }),
  );
};

const clearButton = el("button", {
  type: "button",
  className: "clear",
  textContent: "\u00D7",
  ariaLabel: "Очистить поиск",
  hidden: true,
  onclick: () => {
    input.value = "";
    clearButton.hidden = true;
    controller.input("");
    input.focus();
  },
});

input.addEventListener("input", () => {
  clearButton.hidden = input.value === "";
  controller.input(input.value);
});

document.body.append(
  el(
    "main",
    {},
    el("h1", { textContent: "Поиск стран" }),
    el("div", { className: "search-box" }, input, clearButton),
    historySlot,
    resultsSlot,
    details.element,
  ),
);

renderHistorySlot();
renderState({ status: "idle" });
input.focus();
