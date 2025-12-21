import { isFocusable } from "tabbable";
import { VirtualFocus } from "../linear.js";
import { compute, findNextFocusable } from "./utils.js";

export class VirtualFocusAllAxis extends VirtualFocus {
  static TAG_NAME = "va-virtual-focus-all-axis";

  protected handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      const currentOption = this.currentOption;
      const grid = compute(this, [...this.getChildren()]);

      const focusables = grid
        .map((_) => _.filter((_) => isFocusable(_)))
        .filter((_) => _.length > 0);

      let x = null;
      let y = null;

      for (let i = 0; i < focusables.length; i++) {
        const page = focusables[i];

        if (!page) continue;

        for (let j = 0; j < page.length; j++) {
          const item = page[j];

          // @ts-expect-error
          if (item?.isSameNode(currentOption)) {
            [x, y] = [j, i];
            break;
          }
        }

        if (y) break;
      }

      x ??= -1;
      y ??= 0;

      let newFocusable = null;
      const loop = this.hasAttribute("loop");
      const wrap = this.hasAttribute("wrap");

      const opts = { x, y, wrap, loop };

      if (event.key === "ArrowDown") {
        newFocusable = findNextFocusable(focusables, "down", opts);
      } else if (event.key === "ArrowRight") {
        newFocusable = findNextFocusable(focusables, "right", opts);
      } else if (event.key === "ArrowUp") {
        newFocusable = findNextFocusable(focusables, "up", opts);
      } else if (event.key === "ArrowLeft") {
        newFocusable = findNextFocusable(focusables, "left", opts);
      } else if (event.key == "Home") {
        newFocusable = focusables[0]?.[0];
      } else if (event.key == "End") {
        const last = focusables[focusables.length - 1];
        newFocusable = last?.[last.length - 1];
      }

      if (!newFocusable) return;

      this.activeElement = newFocusable;
    }
  };
}
