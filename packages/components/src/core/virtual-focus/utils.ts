// export function findNextFocusable(
//   elements: Element[],
//   currentIndex: number,
//   direction: "forward" | "backward",
//   loop = false,
// ) {
//   let count = 0;
//   const iterator = direction === "forward" ? 1 : -1;
//   let next_index = currentIndex + iterator;

//   let focusable = null;
//   let last_focusable_index = null;

//   while (true) {
//     let element = elements[next_index];

//     if (focusable) break;

//     if (!element) {
//       if (loop && count < 1) {
//         if (direction === "forward") {
//           next_index = 0;
//         } else {
//           next_index = elements.length - 1;
//         }

//         count++;

//         continue;
//       }

//       break;
//     }

//     if (isFocusable(element)) {
//       last_focusable_index = next_index;
//       focusable = element;
//       continue;
//     }

//     next_index += iterator;
//   }

//   return next_index;
// }

// export function findNextFocusable(
//   elements: (HTMLElement | Element)[],
//   currentIndex: number,
//   direction: "forward" | "backward",
//   loop = false,
// ) {
//   let nextFocusable = null;

//   const iterator = direction === "forward" ? 1 : -1;
//   let nextIndex = currentIndex + iterator;

//   while (currentIndex < elements.length) {
//     nextFocusable = elements[nextIndex] || null;

//     if (nextFocusable === null) {
//       // This is where wrapping happens. If we're moving forward and get to the end, then we jump to the beginning. If we're moving backward and get to the start, then we jump to the end.
//       if (loop) {
//         if (direction === "forward") {
//           nextFocusable = elements[0];
//         } else {
//           nextFocusable = elements[elements.length - 1];
//         }
//       }

//       break;
//     }

//     if (isFocusable(nextFocusable)) {
//       break;
//     }

//     nextIndex += iterator;
//   }

//   return nextFocusable;
// }

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
