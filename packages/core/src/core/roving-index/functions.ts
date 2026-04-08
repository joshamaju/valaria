import { getNextItem } from "./index.js";
import type { Coordinates, Key, Options, Result } from "../../RovingIndex.js";

export type ElementOptions<T extends HTMLElement> = Omit<
  Options<T>,
  "isFocusable"
> & {
  isFocusable?: (item: T) => boolean;
  preventScroll?: boolean;
};

export function getElementCoordinates<T extends HTMLElement>(
  grid: T[][],
  target: T,
): Coordinates | null {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const row = grid[rowIndex] ?? [];
    const columnIndex = row.indexOf(target);

    if (columnIndex >= 0) {
      return { rowIndex, columnIndex };
    }
  }

  return null;
}

export function focusNextRovingElement<T extends HTMLElement>(
  grid: T[][],
  current: T | Coordinates,
  key: Key,
  options: ElementOptions<T> = {},
): Result<T> {
  const coordinates = isCoordinates(current)
    ? current
    : getElementCoordinates(grid, current);

  if (!coordinates) {
    return null;
  }

  const controllerOptions: Options<T> = {
    isFocusable: options.isFocusable ?? isFocusableElement,
  };

  if (options.wrap !== undefined) {
    controllerOptions.wrap = options.wrap;
  }

  if (options.loop !== undefined) {
    controllerOptions.loop = options.loop;
  }

  const next = getNextItem(grid, coordinates, key, controllerOptions);

  if (next) {
    if (options.preventScroll !== undefined) {
      next.item.focus({ preventScroll: options.preventScroll });
    } else {
      next.item.focus();
    }
  }

  return next;
}

export function isFocusableElement(element: HTMLElement): boolean {
  return (
    !isDisabledElement(element) &&
    !element.hidden &&
    element.getAttribute("aria-hidden") !== "true" &&
    element.tabIndex >= 0
  );
}

function isCoordinates(value: HTMLElement | Coordinates): value is Coordinates {
  return "rowIndex" in value && "columnIndex" in value;
}

function isDisabledElement(element: HTMLElement): boolean {
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true"
  );
}
