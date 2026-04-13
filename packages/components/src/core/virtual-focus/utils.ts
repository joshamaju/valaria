export function findNextFocusable(
  elements: (HTMLElement | Element)[],
  currentIndex: number,
  direction: "forward" | "backward",
  loop = false,
) {
  const iterator = direction === "forward" ? 1 : -1;
  let nextIndex = currentIndex + iterator;

  let nextFocusable = elements[nextIndex] || undefined;

  if (!nextFocusable) {
    // This is where wrapping happens. If we're moving forward and get to the end, then we jump to the beginning. If we're moving backward and get to the start, then we jump to the end.
    if (loop) {
      if (direction === "forward") {
        nextFocusable = elements[0];
      } else {
        nextFocusable = elements[elements.length - 1];
      }
    }
  }

  return nextFocusable;
}
