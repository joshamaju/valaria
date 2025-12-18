import type { Dimension, Rect } from "../../Pager.js";

export class Pager<T = any> {
  constructor(
    private viewport: T,
    private elements: T[],
    private geometry: Dimension,
  ) {}

  compute() {
    /**
     * Uses a sliding window technique. Calculates how many items can
     * fit within the viewport, taking into account gap between items.
     *
     * When no more items can fit the available space, we slide the window and perform
     * the calculations again until a page is assigned to all nodes.
     */
    let counter = 0; // tracks the current page
    let page: T[] = [];
    const items = this.elements;
    let accumulator: T[][] = [];
    let accumulated_size = 0; // usually width

    const rect = this.geometry.measure(this.viewport);
    let viewport: Rect = JSON.parse(JSON.stringify(rect));

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const previous = items[i - 1];

      if (!current) continue;

      const current_rect = this.geometry.measure(current);
      const previous_rect = previous ? this.geometry.measure(previous) : null;

      // gap (usually left) from the previous element (if not first child)
      const start =
        counter == 0 ? 0 : current_rect.start - (previous_rect?.end ?? 0);

      // take into account spacing (width if horizontal)
      const size = start + current_rect.size;

      accumulated_size = accumulated_size + size;

      counter++;

      // if new item can fit into container size
      if (accumulated_size <= viewport.size) {
        page.push(current);
      }

      // else start a new page
      if (accumulated_size > viewport.size) {
        viewport = { ...viewport, start: current_rect.start };
        accumulator = [...accumulator, page];
        accumulated_size = size;
        page = [current];
        counter = 0;
      }
    }

    accumulator = [...accumulator, page];

    return accumulator.filter((_) => _.length > 0);
  }
}
