export class HttpError extends Error {
  readonly status: number;

  constructor(_status: number) {
    super("not implemented");
    throw new Error("not implemented");
  }
}

export type ErrorKind =
  | { readonly kind: "cancelled" }
  | { readonly kind: "timeout" }
  | { readonly kind: "http"; readonly status: number }
  | { readonly kind: "network" };

export const classifyError = (_error: unknown): ErrorKind => {
  throw new Error("not implemented");
};
