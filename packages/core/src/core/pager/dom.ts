import type { Dimension, Rect } from "../../Pager.js";

type Orientation = "horizontal" | "vertical";

export class DOMDimension implements Dimension {
  constructor(private orientation?: Orientation) {}

  measure(element: Element | HTMLElement): Rect {
    const dir = this.orientation;
    const rect = element.getBoundingClientRect();
    const start = rect[dir == "horizontal" ? "left" : "top"];
    const end = rect[dir == "horizontal" ? "right" : "bottom"];
    const size = rect[dir == "horizontal" ? "width" : "height"];
    return { start, end, size };
  }
}
