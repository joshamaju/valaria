/**
 * @since 0.0.1
 */
import * as core from "./core/pager/function.js";

export {
  /**
   * @since 0.0.1
   * @category model
   */
  Pager,
} from "./core/pager/index.js";

export {
  /**
   * @since 0.0.1
   * @category model
   */
  DOMDimension,
} from "./core/pager/dom.js";

/**
 * @since 0.0.1
 * @category model
 */
export type Rect = Record<"start" | "end" | "size", number>;

/**
 * @since 0.0.1
 * @category model
 */
export interface Dimension {
  measure(element: any): Rect;
}

/**
 * @since 0.0.1
 * @category utils
 */
export const getIntersectionRatio: <T>(
  child: T,
  parent: T,
  geometry: Dimension,
) => number = core.getIntersectionRatio;
