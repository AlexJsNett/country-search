export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP error ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

export type ErrorKind =
  | { readonly kind: "cancelled" }
  | { readonly kind: "timeout" }
  | { readonly kind: "http"; readonly status: number }
  | { readonly kind: "network" };

const hasName = (error: unknown, name: string): boolean =>
  error instanceof DOMException && error.name === name;

export const classifyError = (error: unknown): ErrorKind => {
  if (hasName(error, "AbortError")) return { kind: "cancelled" };
  if (hasName(error, "TimeoutError")) return { kind: "timeout" };
  if (error instanceof HttpError) return { kind: "http", status: error.status };
  return { kind: "network" };
};
