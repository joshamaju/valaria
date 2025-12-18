import { isFocusable } from "tabbable";
import { Widget } from "../widget.js";
import { compute, findNextFocusable, move } from "./utils.js";

const ITEM_FOCUS_EVENT = "focus";
const ITEM_FOCUSOUT_EVENT = "focusout";

export class VirtualFocus extends Widget {
  static TAG_NAME = "kt-virtual-focus";

  protected currentOption?: Element | HTMLElement | undefined | null;

  get activeElement() {
    return this.currentOption;
  }

  set activeElement(element: HTMLElement | Element | undefined | null) {
    const event = this.emit("change", {
      detail: { target: element },
      cancelable: true,
      bubbles: true,
    });

    if (event.defaultPrevented) return;

    this.currentOption?.removeAttribute("data-virtual-focus-selected");
    this.currentOption = element;
    this.currentOption?.setAttribute("data-virtual-focus-selected", "true");
  }

  disconnectedCallback() {
    this.unmount();
  }

  connectedCallback() {
    if (this.hasAttribute("data-mount")) this.mount();
  }

  mount() {
    this.activeElement =
      this.currentOption ??
      this.querySelector("[data-virtual-focus-child=active]");

    const children = this.getChildren();

    children.forEach((_) => {
      _.addEventListener(ITEM_FOCUS_EVENT, this.#itemFocus);
      _.addEventListener(ITEM_FOCUSOUT_EVENT, this.#itemFocusOut);
    });

    document.addEventListener("keydown", this.handleDocumentKeyDown);
  }

  unmount() {
    this.currentOption?.removeAttribute("data-virtual-focus-selected");

    if (!this.hasAttribute("data-preserve")) this.currentOption = undefined;

    const children = this.getChildren();

    children.forEach((_) => {
      _.removeEventListener(ITEM_FOCUS_EVENT, this.#itemFocus);
      _.removeEventListener(ITEM_FOCUSOUT_EVENT, this.#itemFocusOut);
    });

    document.removeEventListener("keydown", this.handleDocumentKeyDown);
  }

  protected getChildren() {
    return this.querySelectorAll("[data-virtual-focus-child]");
  }

  #itemFocus = (e: Event) => {
    e.stopPropagation();
    this.activeElement = e.target as HTMLElement;
  };

  #itemFocusOut = (e: Event) => {
    e.stopPropagation();
    this.activeElement = undefined;
  };

  protected handleDocumentKeyDown = (event: KeyboardEvent) => {
    const options = [...this.getChildren()];
    const currentOption = this.currentOption ?? options[0];

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
      // @ts-expect-error
      const currentIndex = options.indexOf(currentOption);
      const loop = this.hasAttribute("data-loop");

      let newIndex = Math.max(0, currentIndex);

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        newIndex = findNextFocusable(options, currentIndex, "forward", loop);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        newIndex = findNextFocusable(options, currentIndex, "backward", loop);
      } else if (event.key === "Home") {
        const focusables = options.filter((_) => isFocusable(_));
        newIndex = options.indexOf(focusables[0]!);
      } else if (event.key === "End") {
        const focusables = options.filter((_) => isFocusable(_));
        newIndex = options.indexOf(focusables[focusables.length - 1]!);
      }

      const option = options[newIndex] as HTMLElement;

      this.activeElement = option;
    }
  };
}

export class VirtualFocusAllAxis extends VirtualFocus {
  static TAG_NAME = "kt-virtual-focus-all-axis";

  handleDocumentKeyDown = (event: KeyboardEvent) => {
    const options = this.getChildren();
    const currentOption = this.currentOption ?? options[0];

    const grid = compute(this, [...options]);

    let currentX = null;
    let currentY = null;

    for (let i = 0; i < grid.length; i++) {
      const page = grid[i];

      if (!page) continue;

      for (let j = 0; j < page.length; j++) {
        const item = page[j];

        // @ts-expect-error
        if (item?.isSameNode(currentOption)) {
          [currentX, currentY] = [j, i];
          break;
        }
      }

      if (currentY) break;
    }

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
      const loop = this.hasAttribute("data-loop");

      currentX ??= 0;
      currentY ??= 0;

      let newX = currentX;
      let newY = currentY;

      if (event.key === "ArrowDown") {
        const [x, y] = move(grid, {
          direction: "down",
          x: currentX,
          y: currentY,
          loop,
        });

        [newX, newY] = [x, y];
      } else if (event.key === "ArrowRight") {
        const [x, y] = move(grid, {
          direction: "right",
          x: currentX,
          y: currentY,
        });

        [newX, newY] = [x, y];
      } else if (event.key === "ArrowUp") {
        const [x, y] = move(grid, {
          direction: "up",
          x: currentX,
          y: currentY,
          loop,
        });

        [newX, newY] = [x, y];
      } else if (event.key === "ArrowLeft") {
        const [x, y] = move(grid, {
          direction: "left",
          x: currentX,
          y: currentY,
        });

        [newX, newY] = [x, y];
      } else if (event.key == "Home") {
        [newX, newY] = [0, 0];
      } else if (event.key == "End") {
        [newX, newY] = [grid[grid.length - 1]!.length - 1, grid.length - 1];
      }

      this.activeElement = grid[newY]?.[newX];
    }
  };
}
