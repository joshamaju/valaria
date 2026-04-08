/**
 * @since 0.0.2
 */
import * as core from "./core/roving-index/index.js";
import * as functions from "./core/roving-index/functions.js";

/**
 * @since 0.0.2
 * @category types
 */
export type Key = "ArrowRight" | "ArrowLeft" | "ArrowDown" | "ArrowUp";

/**
 * @since 0.0.2
 * @category types
 */
export type Coordinates = {
  rowIndex: number;
  columnIndex: number;
};

/**
 * @since 0.0.2
 * @category types
 */
export type Options<T> = {
  wrap?: boolean;
  loop?: boolean;
  isFocusable?: (item: T) => boolean;
};

/**
 * @since 0.0.2
 * @category types
 */
export type Grid<T> = T[][];

/**
 * @since 0.0.2
 * @category types
 */
export type Result<T> = {
  item: T;
  rowIndex: number;
  flatIndex: number;
  columnIndex: number;
} | null;

/**
 * @since 0.0.2
 * @category constructors
 */
export const getNextItem = core.getNextItem;

/**
 * @since 0.0.1
 * @category utils
 */
export const getElementCoordinates: <T extends HTMLElement>(
  grid: T[][],
  target: T,
) => Coordinates | null = functions.getElementCoordinates;

/**
 * @since 0.0.1
 * @category utils
 */
export const focusNextElement: <T extends HTMLElement>(
  grid: T[][],
  current: T | Coordinates,
  key: Key,
  options?: functions.ElementOptions<T>,
) => Result<T> = functions.focusNextRovingElement;
