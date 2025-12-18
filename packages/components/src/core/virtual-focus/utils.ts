import { isFocusable } from "tabbable";

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

export function findNextFocusable(
  elements: Element[],
  currentIndex: number,
  direction: "forward" | "backward",
  loop = false,
) {
  let count = 0;
  const iterator = direction === "forward" ? 1 : -1;
  let next_index = currentIndex + iterator;

  let focusable = null;
  let last_focusable_index = null;

  while (true) {
    let element = elements[next_index];

    if (focusable) break;

    if (!element) {
      if (loop && count < 1) {
        if (direction === "forward") {
          next_index = 0;
        } else {
          next_index = elements.length - 1;
        }

        count++;

        continue;
      }

      break;
    }

    if (isFocusable(element)) {
      last_focusable_index = next_index;
      focusable = element;
      continue;
    }

    next_index += iterator;
  }

  return next_index;
}

type Direction = "right" | "left" | "up" | "down";

export function move(
  arr: any[][],
  {
    x,
    y,
    direction,
    wrap = true,
    loop = false,
  }: Record<"x" | "y", number> & {
    direction: Direction;
    loop?: boolean;
    wrap?: boolean;
  },
) {
  let x_ = x;
  let y_ = y;
  let count = 0;

  const jump_to = (x: number, y: number) => {
    [x_, y_] = [x, y];
  };

  const step_down = () => {
    y_ += 1;
  };

  const step_up = () => {
    y_ -= 1;
  };

  const step_left = () => {
    x_ -= 1;
  };

  const step_right = () => {
    x_ += 1;
  };

  const nearest = (arr: any[], index: number) => {
    let l = index - 1;

    for (; l >= 0; l--) {
      if (arr[l]) break;
    }

    // let r = index + 1;

    // for (; r <= arr.length - 1; r++) {
    //   if (arr[r]) break;
    // }

    // if (r <= arr.length && index - l > r - index) {
    //   return r;
    // }

    return l;
  };

  const go_right = (wrap?: boolean) => {
    const element = arr[y_]?.[x_];
    let last_focusable_x: number | null = null;

    if (element && isFocusable(element)) {
      last_focusable_x = x_;
    }

    step_right();

    console.log("go right", x_, y_);

    let focusable = null;

    while (true) {
      const element = arr[y_]?.[x_];

      if (focusable) {
        jump_to(last_focusable_x ?? x_, y_);
        break;
      }

      // we've reached the end, either left or right
      if (!element) {
        // reverse the last operation
        if (focusable && x_ > focusable.length - 1) {
          step_left();
        }

        jump_to(last_focusable_x ?? x_, y_);

        if (wrap) {
          jump_to(0, y_ >= arr.length - 1 ? -1 : y_);
          go_down();
        }

        break;
      }

      if (isFocusable(element)) {
        last_focusable_x = x_;
        focusable = element;
        continue;
      }

      step_right();
    }

    console.log("right last", last_focusable_x, x_);

    // jump_to(last_focusable_x ?? x_, y_);

    return focusable;
  };

  const go_left = (wrap?: boolean) => {
    const element = arr[y_]?.[x_];
    let last_focusable_x: number | undefined | null = null;
    let last_focusable_y: number | undefined | null = null;

    if (isFocusable(element)) {
      last_focusable_x = x_;
      last_focusable_y = y_;
    }

    step_left();

    let focusable = null;

    while (true) {
      const element = arr[y_]?.[x_];

      if (focusable) {
        jump_to(last_focusable_x ?? x_, y_);
        break;
      }

      // we've reached the end, either left or right
      if (!element) {
        // reverse the last operation
        if (x_ < 0) step_right();

        jump_to(last_focusable_x ?? x_, y_);

        if (wrap) {
          //   jump_to(arr[y_ - 1]!?.length ?? -1, y_);
          jump_to(-1, y <= 0 ? arr.length : y_); // use 0 for now because `go_up` doesn't support backward movement
          go_up(last_focusable_x, last_focusable_y);
        }

        break;
      }

      if (isFocusable(element)) {
        last_focusable_x = x_;
        last_focusable_y = y_;
        focusable = element;
        continue;
      }

      step_left();
    }

    // jump_to(last_focusable_x ?? x_, y_);

    return focusable;
  };

  const go_down = (
    last_x?: number | null,
    last_y?: number | null,
    last_direction?: Direction,
  ) => {
    const element = arr[y_]?.[x_];
    let last_focusable_x = last_x;
    let last_focusable_y = last_y;

    if (element && isFocusable(element)) {
      last_focusable_x = x_;
      last_focusable_y = y_;
    }

    step_down();

    const last = arr[y];
    const current = arr[y_];

    if (!current) {
      if (loop && count < 1) {
        count++;
        jump_to(0, -1);
        go_down(last_focusable_x, last_focusable_y);
      } else {
        step_up();
      }

      return;
    }

    let direction: Direction = last_direction ?? "left";

    if (last && current && current.length !== last.length) {
      let distance = 0;

      if (x_ >= last.length - 1) {
        distance = current.length - 1;
      } else if (x_ >= last.length - 1 && last.length > current.length) {
        distance = current.length - 1;
      } else if (current.length > last.length) {
        distance = last.length - 1;
      } else {
        distance = x_;
        direction = "right";
      }

      //   console.log("nearest", x_, distance);

      jump_to(0, y_);
      // jump_to(current.length - 1, y_);
    }

    let focusable = null;

    // while (true) {
    //   let element = arr[y_]?.[x_];

    //   console.log("down", x_, y_);

    //   if (focusable) {
    //     jump_to(last_focusable_x ?? x_, last_focusable_y ?? y_);
    //     break;
    //   }

    //   if (y_ > arr.length - 1) {
    //     jump_to(last_focusable_x ?? x_, last_focusable_y ?? y_ - 1);
    //     break;
    //   }

    //   if (!element && (x_ < 0 || (current && x_ >= current.length - 1))) {
    //     console.log("going down");
    //     jump_to(0, y_);
    //     go_down(last_focusable_x, last_focusable_y, "right");
    //     break;
    //   }

    //   //   if (!element) {
    //   //     // console.log("should go down");
    //   //     break;
    //   //   }

    //   if (current && x_ > current.length - 1) step_left();
    //   if (x_ < 0) step_right();

    //   if (isFocusable(element)) {
    //     last_focusable_x = x_;
    //     last_focusable_y = y_;
    //     focusable = element;
    //     continue;
    //   }

    //   //   if (current && x_ >= current.length - 1) {
    //   //     console.log('going down');
    //   //     jump_to(0, y_)
    //   //     go_down(last_focusable_x, last_focusable_y);
    //   //     break;
    //   //   }

    //   if (direction == "right") {
    //     step_right();
    //   } else {
    //     step_left();
    //   }
    // }

    jump_to(-1, y_);

    const found = go_right(false);

    if (!found) {
      go_down(last_focusable_x, last_focusable_y);
    }

    // jump_to(last_focusable_x ?? x_, last_focusable_y ?? y_);

    //   let element = arr[y_]?.[x_];

    //   do {
    //     console.log("move x", x_, element);

    //     if (isFocusable(element)) break;

    //     step_right();

    //     element = arr[y_]?.[x_];
    //   } while (element);
  };

  const go_up = (last_x?: number | null, last_y?: number | null) => {
    const element = arr[y_]?.[x_];
    let last_focusable_x = last_x;
    let last_focusable_y = last_y;

    if (element && isFocusable(element)) {
      last_focusable_x = x_;
      last_focusable_y = y_;
    }

    step_up();

    const current = arr[y_];

    if (!current) {
      if (loop && count < 1) {
        count++;
        jump_to(0, arr.length);
        go_up(last_focusable_x, last_focusable_y);
      } else {
        step_down();
      }

      return;
    }

    // if (current && x_ >= current.length - 1) {
    //   jump_to(0, y_);
    //   // jump_to(current.length - 1, y_);
    // }

    // let focusable = null;

    // while (true) {
    //   let element = arr[y_]?.[x_];

    //   if (focusable) {
    //     // jump to current item if focusable to walk back to last focusable
    //     jump_to(last_focusable_x ?? x_, last_focusable_y ?? y_);
    //     break;
    //   }

    //   if (y_ < 0) {
    //     // walk back last update
    //     jump_to(last_focusable_x ?? x_, last_focusable_y ?? y_ - 1);

    //     if (loop && count < 1) {
    //       count++;
    //       jump_to(arr[arr.length - 1]!.length - 1, arr.length - 1);
    //       go_up(last_focusable_x, last_focusable_y);
    //     }

    //     break;
    //   }

    //   if (current && x_ > current.length - 1) step_left();

    //   if (isFocusable(element)) {
    //     last_focusable_x = x_;
    //     last_focusable_y = y_;
    //     focusable = element;
    //     continue;
    //   }

    //   if (current && x_ >= current.length - 1) {
    //     go_up(last_focusable_x, last_focusable_y);
    //     break;
    //   }

    //   step_right();
    // }

    jump_to(-1, y_);

    const found = go_right(false);

    if (!found) {
      go_up(last_focusable_x, last_focusable_y);
    }
  };

  switch (direction) {
    case "down": {
      go_down();
      break;
    }

    case "up": {
      go_up();
      break;
    }

    case "right": {
      go_right(wrap);
      break;
    }

    case "left": {
      go_left(wrap);
      break;
    }

    // case "right": {
    //   const element = arr[y_]?.[x_];
    //   let last_focusable_x: number | null = null;

    //   if (isFocusable(element)) {
    //     last_focusable_x = x_;
    //   }

    //   step_right();

    //   let focusable = null;

    //   while (true) {
    //     const element = arr[y_]?.[x_];

    //     if (focusable) {
    //       jump_to(last_focusable_x ?? x_, y_);
    //       break;
    //     }

    //     // we've reached the end, either left or right
    //     if (!element) {
    //       // reverse the last operation
    //       if (focusable && x_ > focusable.length - 1) {
    //         step_left();
    //       }

    //       break;
    //     }

    //     if (isFocusable(element)) {
    //       last_focusable_x = x_;
    //       focusable = element;
    //       continue;
    //     }

    //     step_right();
    //   }

    //   jump_to(last_focusable_x ?? x_, y_);

    //   break;
    // }

    // case "left": {
    //   const element = arr[y_]?.[x_];
    //   let last_focusable_x: number | null = null;

    //   if (isFocusable(element)) {
    //     last_focusable_x = x_;
    //   }

    //   step_left();

    //   let focusable = null;

    //   while (true) {
    //     const element = arr[y_]?.[x_];

    //     if (focusable) {
    //       jump_to(last_focusable_x ?? x_, y_);
    //       break;
    //     }

    //     // we've reached the end, either left or right
    //     if (!element) {
    //       // reverse the last operation
    //       if (x_ < 0) step_right();
    //       break;
    //     }

    //     if (isFocusable(element)) {
    //       last_focusable_x = x_;
    //       focusable = element;
    //       continue;
    //     }

    //     step_left();
    //   }

    //   jump_to(last_focusable_x ?? x_, y_);

    //   break;
    // }
  }

  return [x_, y_] as const;
}
