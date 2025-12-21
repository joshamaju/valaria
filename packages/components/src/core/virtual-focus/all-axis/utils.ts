type Direction = "right" | "left" | "up" | "down";

export function compute(viewport: Element, elements: Element[]) {
  /**
   * Uses a sliding window technique. Calculates how many items can
   * fit within the viewport, taking into account gap between items.
   *
   * When no more items can fit the available space, we slide the window and perform
   * the calculations again until a page is assigned to all nodes.
   */
  let counter = 0;
  const items = elements;
  let page: Element[] = [];
  let accumulated_size = 0; // usually width
  let accumulator: Element[][] = [];

  const rect = viewport.getBoundingClientRect();

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const previous = items[i - 1];

    if (!current) continue;

    const current_rect = current.getBoundingClientRect();
    const previous_rect = previous ? previous.getBoundingClientRect() : null;

    // gap (usually left) from the previous element (if not first child)
    let gap =
      counter == 0
        ? 0
        : current_rect.left -
          ((previous_rect?.left ?? 0) + (previous_rect?.width ?? 0));

    if (gap < 0) gap = 0;

    // take into account spacing (width if horizontal)
    const size = gap + current_rect.width;

    accumulated_size = accumulated_size + size;

    counter++;

    let inserted = false;

    // if new item can fit into container size
    if (accumulated_size <= rect.width) {
      page.push(current);
      inserted = true;
    }

    // else start a new page
    if (accumulated_size >= rect.width) {
      accumulated_size = inserted ? 0 : size;
      accumulator = [...accumulator, page];
      page = inserted ? [] : [current];
      counter = 0;
    }
  }

  accumulator = [...accumulator, page];

  return accumulator.filter((_) => _.length > 0);
}

// export function findNextFocusable(
//   elements: (HTMLElement | Element)[][],
//   direction: Direction,
//   {
//     x,
//     y,
//     wrap = true,
//     loop = false,
//   }: Record<"x" | "y", number> & { loop?: boolean; wrap?: boolean },
// ) {
//   let x_ = x;
//   let y_ = y;
//   let count = 0;

//   const jump_to = (x: number, y: number) => {
//     [x_, y_] = [x, y];
//   };

//   const step_down = () => {
//     y_ += 1;
//   };

//   const step_up = () => {
//     y_ -= 1;
//   };

//   const step_left = () => {
//     x_ -= 1;
//   };

//   const step_right = () => {
//     x_ += 1;
//   };

//   const go_right = (wrap?: boolean) => {
//     step_right();

//     let focusable: Element | undefined | null = null;

//     while (true) {
//       const row = elements[y_];
//       focusable = row?.[x_];

//       // we've reached the end, either left or right
//       if (!focusable) {
//         // reverse the last operation
//         if (row && x_ > row.length - 1) step_left();

//         if (y_ >= elements.length - 1 && !loop) break;

//         if (wrap) {
//           jump_to(0, y_ >= elements.length - 1 ? -1 : y_);
//           return go_down("right");
//         }

//         break;
//       }

//       if (isFocusable(focusable)) break;

//       step_right();
//     }

//     return focusable;
//   };

//   const go_left = (wrap?: boolean) => {
//     step_left();

//     let focusable: Element | undefined | null = null;

//     while (true) {
//       focusable = elements[y_]?.[x_];

//       // we've reached the end, either left or right
//       if (!focusable) {
//         // reverse the last operation
//         if (x_ < 0) step_right();

//         if (y_ <= 0 && !loop) break;

//         if (wrap) {
//           jump_to(elements[y_]?.length ?? -1, y <= 0 ? elements.length : y_);
//           return go_up("left");
//         }

//         break;
//       }

//       if (isFocusable(focusable)) break;

//       step_left();
//     }

//     return focusable;
//   };

//   const go_down = (last_direction?: Direction): Element | null => {
//     step_down();

//     const last = elements[y];
//     const current = elements[y_];

//     if (!current) {
//       if (loop && count < 1) {
//         count++;
//         jump_to(0, -1);
//         return go_down();
//       } else {
//         step_up();
//       }

//       return null;
//     }

//     const element = elements[y_]?.[x_];

//     if (element && isFocusable(element)) {
//       return element;
//     }

//     let direction: Direction = last_direction ?? "right";

//     if (last && current && current.length !== last.length) {
//       if (x_ < current.length - 1) {
//         // direction = "left";
//       }
//     }

//     jump_to(direction == "right" ? -1 : current.length, y_);

//     const found = direction == "right" ? go_right(false) : go_left(false);

//     if (!found) return go_down(direction);

//     return found;
//   };

//   const go_up = (last_direction?: Direction): Element | null => {
//     step_up();

//     const last = elements[y];
//     const current = elements[y_];

//     if (!current) {
//       if (loop && count < 1) {
//         count++;
//         jump_to(0, elements.length);
//         return go_up();
//       } else {
//         step_down();
//       }

//       return null;
//     }

//     const element = elements[y_]?.[x_];

//     if (element && isFocusable(element)) {
//       return element;
//     }

//     let direction: Direction = last_direction ?? "right";

//     if (last && current && current.length !== last.length) {
//       if (x_ >= current.length - 1) {
//         // direction = "left";
//       }
//     }

//     jump_to(direction == "right" ? -1 : current.length, y_);

//     const found = direction == "right" ? go_right(false) : go_left(false);

//     if (!found) return go_up(direction);

//     return found;
//   };

//   switch (direction) {
//     case "down": {
//       return go_down();
//     }

//     case "up": {
//       return go_up();
//     }

//     case "right": {
//       return go_right(wrap);
//     }

//     case "left": {
//       return go_left(wrap);
//     }
//   }
// }

export function findNextFocusable(
  elements: (HTMLElement | Element)[][],
  direction: Direction,
  {
    x,
    y,
    wrap = true,
    loop = false,
  }: Record<"x" | "y", number> & { loop?: boolean; wrap?: boolean },
) {
  const rows = elements.length;

  const go_right = (wrap?: boolean) => {
    const row = elements[y];

    if (row) {
      if (x + 1 < row.length) return elements[y]?.[x + 1];
      if (y + 1 < rows) return elements[y + 1]?.[0];
      if (wrap) return elements[0]?.[0];
      return row[x];
    }
  };

  const go_left = (wrap?: boolean) => {
    if (x - 1 >= 0) {
      return elements[y]?.[x - 1];
    }

    if (y - 1 >= 0) {
      const prev_row_length = elements[y - 1]?.length;

      if (prev_row_length) {
        return elements[y - 1]?.[prev_row_length - 1];
      }
    }

    if (wrap) {
      const lastRow = rows - 1;
      const row = elements[lastRow];
      if (row) return elements[lastRow]?.[row.length - 1];
    }

    return elements[y]?.[x];
  };

  const go_down = () => {
    if (y + 1 < rows) {
      const row = elements[y + 1];
      if (row) return row?.[Math.min(x, row.length - 1)];
    }

    if (loop) {
      const head = elements[0];

      if (head) {
        return head[Math.min(x, head.length - 1)];
      }
    }

    return elements[y]?.[x];
  };

  const go_up = () => {
    if (y - 1 >= 0) {
      const row = elements[y - 1];

      if (row) {
        return row?.[Math.min(x, row.length - 1)];
      }
    }

    if (loop) {
      const lastRow = rows - 1;
      return elements[lastRow]?.[Math.min(x, elements[lastRow].length - 1)];
    }

    return elements[y]?.[x];
  };

  switch (direction) {
    case "down": {
      return go_down();
    }

    case "up": {
      return go_up();
    }

    case "right": {
      return go_right(wrap);
    }

    case "left": {
      return go_left(wrap);
    }
  }
}
