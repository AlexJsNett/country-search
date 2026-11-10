export type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): Debounced<Args> => {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timerId);
  return debounced;
};
