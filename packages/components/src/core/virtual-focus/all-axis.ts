import { isTabbable } from "tabbable";
import * as RovingIndex from "valaria/RovingIndex";

import { VirtualFocus } from "./linear.js";

const defaultCoordinates: RovingIndex.Coordinates = {
  rowIndex: 0,
  columnIndex: 0,
};
export class VirtualFocusAllAxis extends VirtualFocus {
  static override TAG_NAME = "va-virtual-focus-all-axis";

  private coordinates = defaultCoordinates;

  #grid() {
    const elements = [...this.getChildren()] as HTMLElement[];

    const grid: HTMLElement[][] = [];

    const size = Number(this.getAttribute("size") ?? 4);

    let index = 0;

    while (index < elements.length) {
      grid.push(elements.slice(index, index + size));
      index += size;
    }

    return grid;
  }

  protected itemFocus = (e: Event) => {
    e.stopPropagation();

    const elements = this.#grid();
    const target = e.target as HTMLElement;
    const coords = RovingIndex.getElementCoordinates(elements, target);

    if (coords) {
      this.activeElement = elements[coords?.rowIndex]?.[coords?.columnIndex];
      this.coordinates = coords;
    }
  };

  protected itemFocusOut = (e: Event) => {
    e.stopPropagation();
    this.coordinates = defaultCoordinates;
    this.activeElement = undefined;
  };

  protected handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      const grid = this.#grid();

      const loop = this.hasAttribute("loop");
      const wrap = this.hasAttribute("wrap");

      const next = RovingIndex.getNextItem(
        grid,
        this.coordinates,
        event.key as RovingIndex.Key,
        { wrap, loop, isFocusable: isTabbable },
      );

      if (!next) return;

      this.activeElement = next.item;

      this.coordinates.rowIndex = next.rowIndex;
      this.coordinates.columnIndex = next.columnIndex;
    }
  };

  public unmount() {
    if (!this.hasAttribute("preserve")) this.coordinates = defaultCoordinates;
    super.unmount();
  }
}
