import type { ErrorKind } from "../logic/errors.js";

export const formatNumber = (value: number): string =>
  value.toLocaleString("ru-RU");

export const describeError = (error: ErrorKind): string => {
  switch (error.kind) {
    case "http":
      return `Сервер вернул ошибку (${error.status}). Попробуйте ещё раз.`;
    case "timeout":
      return "Сервер слишком долго не отвечает. Попробуйте ещё раз.";
    case "network":
    case "cancelled":
      return "Не удалось связаться с сервером. Проверьте соединение.";
  }
};
