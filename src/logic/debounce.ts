export type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export const debounce = <Args extends unknown[]>(
  _fn: (...args: Args) => void,
  _delay: number,
): Debounced<Args> => {
  throw new Error("not implemented");
};
