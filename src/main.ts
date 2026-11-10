import { searchCountries } from "./logic/api.js";
import { createCachedSearch } from "./logic/cache.js";
import { addToHistory, loadHistory, saveHistory } from "./logic/history.js";
import { createSearchController, type SearchState } from "./logic/search.js";
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
  type: "search",
  className: "search",
  placeholder: "Введите название страны",
  autocomplete: "off",
  ariaLabel: "Название страны",
});

const controller = createSearchController({
  search: createCachedSearch(searchCountries),
  onState: (state) => {
    remember(state);
    renderState(state);
  },
});

const remember = (state: SearchState) => {
  if (state.status !== "results" && state.status !== "empty") return;
  history = addToHistory(history, state.query);
  saveHistory(localStorage, history);
  renderHistorySlot();
};

const renderHistorySlot = () => {
  historySlot.replaceChildren(
    ...(history.length > 0
      ? [
          renderHistory(history, (query) => {
            input.value = query;
            controller.searchNow(query);
          }),
        ]
      : []),
  );
};

const renderState = (state: SearchState) => {
  resultsSlot.replaceChildren(
    ...renderResults(state, {
      onOpen: details.open,
      onRetry: controller.retry,
    }),
  );
};

input.addEventListener("input", () => controller.input(input.value));

document.body.append(
  el(
    "main",
    {},
    el("h1", { textContent: "Поиск стран" }),
    input,
    historySlot,
    resultsSlot,
    details.element,
  ),
);

renderHistorySlot();
renderState({ status: "idle" });
input.focus();
