import type { Dimension } from "../../Pager.js";

export function getIntersectionRatio<T>(child: T, parent: T, sys: Dimension) {
  const child_sides = sys.measure(child);
  const parent_sides = sys.measure(parent);

  // Determine the visible edges
  const visible_start = Math.max(child_sides.start, parent_sides.start);
  const visible_end = Math.min(child_sides.end, parent_sides.end);

  // Width of the visible portion
  return Math.max(0, visible_end - visible_start);
}
