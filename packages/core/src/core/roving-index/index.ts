import type {
  Grid,
  Coordinates,
  Key,
  Options,
  Result,
} from "../../RovingIndex.js";

type NormalizedItem<T> = {
  item: T;
  rowIndex: number;
  flatIndex: number;
  focusable: boolean;
  columnIndex: number;
};

type NormalizedGrid<T> = {
  items: NormalizedItem<T>[];
  rows: NormalizedItem<T>[][];
};

const defaultIsFocusable = <T>(_item: T): boolean => true;

export function getNextItem<T>(
  grid: Grid<T>,
  current: Coordinates,
  key: Key,
  options: Options<T> = {},
): Result<T> {
  const normalized = normalizeGrid(
    grid,
    options.isFocusable ?? defaultIsFocusable,
  );

  const currentItem = normalized.rows[current.rowIndex]?.[current.columnIndex];

  if (!currentItem) return null;

  const next = getNextNormalizedItem(normalized, currentItem, key, {
    wrap: options.wrap ?? false,
    loop: options.loop ?? false,
  });

  return toResult(next);
}

function normalizeGrid<T>(
  grid: Grid<T>,
  isFocusable: (item: T) => boolean,
): NormalizedGrid<T> {
  const rows: NormalizedItem<T>[][] = [];
  const items: NormalizedItem<T>[] = [];
  let flatIndex = 0;

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const row = grid[rowIndex] ?? [];
    const normalizedRow: NormalizedItem<T>[] = [];

    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const item = row[columnIndex] as T;

      const normalizedItem: NormalizedItem<T> = {
        item,
        rowIndex,
        flatIndex,
        columnIndex,
        focusable: isFocusable(item),
      };

      normalizedRow.push(normalizedItem);
      items.push(normalizedItem);

      flatIndex += 1;
    }

    rows.push(normalizedRow);
  }

  return { rows, items };
}

function getNextNormalizedItem<T>(
  grid: NormalizedGrid<T>,
  current: NormalizedItem<T>,
  key: Key,
  options: Required<Pick<Options<T>, "wrap" | "loop">>,
): NormalizedItem<T> | null {
  switch (key) {
    case "ArrowRight":
      return getNextHorizontalItem(grid, current, "forward", options);
    case "ArrowLeft":
      return getNextHorizontalItem(grid, current, "backward", options);
    case "ArrowDown":
      return getNextVerticalItem(grid, current, "forward", options);
    case "ArrowUp":
      return getNextVerticalItem(grid, current, "backward", options);
  }
}

function getNextHorizontalItem<T>(
  grid: NormalizedGrid<T>,
  current: NormalizedItem<T>,
  direction: "forward" | "backward",
  options: Required<Pick<Options<T>, "wrap" | "loop">>,
): NormalizedItem<T> | null {
  const row = grid.rows[current.rowIndex] ?? [];
  const same_row = findFocusableInRow(row, current.columnIndex, direction);

  if (same_row) return same_row;

  if (options.wrap) {
    const wrapped = findFocusableByFlatIndex(
      grid.items,
      current.flatIndex,
      direction,
    );

    if (wrapped) return wrapped;
  }

  if (
    !options.loop ||
    hasFocusablePast(grid.items, current.flatIndex, direction)
  ) {
    return null;
  }

  // Looping is independent from wrapping: only loop from the global focusable edge.
  return direction === "forward"
    ? firstFocusable(grid.items, current)
    : lastFocusable(grid.items, current);
}

function getNextVerticalItem<T>(
  grid: NormalizedGrid<T>,
  current: NormalizedItem<T>,
  direction: "forward" | "backward",
  options: Required<Pick<Options<T>, "wrap" | "loop">>,
): NormalizedItem<T> | null {
  const rowOrder = getVerticalRowOrder(
    grid.rows.length,
    current.rowIndex,
    direction,
    options.loop,
  );

  for (const rowIndex of rowOrder) {
    const row = grid.rows[rowIndex] ?? [];

    if (rowIndex === current.rowIndex) {
      // A vertical loop can revisit the current row in single-row grids; use row-major fallback.
      const loopFallback =
        direction === "forward"
          ? firstFocusable(row, current)
          : lastFocusable(row, current);

      if (loopFallback) return loopFallback;

      continue;
    }

    const nearest = findNearestFocusableInRow(row, current.columnIndex);

    if (nearest) return nearest;
  }

  return null;
}

function findFocusableInRow<T>(
  row: NormalizedItem<T>[],
  fromColumnIndex: number,
  direction: "forward" | "backward",
): NormalizedItem<T> | null {
  if (direction === "forward") {
    for (let index = fromColumnIndex + 1; index < row.length; index += 1) {
      const item = row[index];
      if (item?.focusable) return item;
    }
  } else {
    for (let index = fromColumnIndex - 1; index >= 0; index -= 1) {
      const item = row[index];
      if (item?.focusable) return item;
    }
  }

  return null;
}

function findFocusableByFlatIndex<T>(
  items: NormalizedItem<T>[],
  fromFlatIndex: number,
  direction: "forward" | "backward",
): NormalizedItem<T> | null {
  if (direction === "forward") {
    for (let index = fromFlatIndex + 1; index < items.length; index += 1) {
      const item = items[index];
      if (item?.focusable) return item;
    }
  } else {
    for (let index = fromFlatIndex - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.focusable) return item;
    }
  }

  return null;
}

function hasFocusablePast<T>(
  items: NormalizedItem<T>[],
  fromFlatIndex: number,
  direction: "forward" | "backward",
): boolean {
  return findFocusableByFlatIndex(items, fromFlatIndex, direction) !== null;
}

function firstFocusable<T>(
  items: NormalizedItem<T>[],
  current: NormalizedItem<T>,
): NormalizedItem<T> | null {
  for (const item of items) {
    if (item.focusable && item !== current) {
      return item;
    }
  }

  return null;
}

function lastFocusable<T>(
  items: NormalizedItem<T>[],
  current: NormalizedItem<T>,
): NormalizedItem<T> | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];

    if (item?.focusable && item !== current) {
      return item;
    }
  }

  return null;
}

function findNearestFocusableInRow<T>(
  row: NormalizedItem<T>[],
  targetColumnIndex: number,
): NormalizedItem<T> | null {
  const exact = row[targetColumnIndex];

  if (exact?.focusable) return exact;

  for (let offset = 1; offset <= row.length; offset += 1) {
    const before = row[targetColumnIndex - offset];

    if (before?.focusable) return before;

    const after = row[targetColumnIndex + offset];

    if (after?.focusable) return after;
  }

  return null;
}

function getVerticalRowOrder(
  rowCount: number,
  currentRowIndex: number,
  direction: "forward" | "backward",
  loop: boolean,
): number[] {
  const row_order: number[] = [];

  if (direction === "forward") {
    for (
      let rowIndex = currentRowIndex + 1;
      rowIndex < rowCount;
      rowIndex += 1
    ) {
      row_order.push(rowIndex);
    }

    if (loop) {
      for (let rowIndex = 0; rowIndex <= currentRowIndex; rowIndex += 1) {
        row_order.push(rowIndex);
      }
    }
  } else {
    for (let rowIndex = currentRowIndex - 1; rowIndex >= 0; rowIndex -= 1) {
      row_order.push(rowIndex);
    }

    if (loop) {
      for (
        let rowIndex = rowCount - 1;
        rowIndex >= currentRowIndex;
        rowIndex -= 1
      ) {
        row_order.push(rowIndex);
      }
    }
  }

  return row_order;
}

function toResult<T>(item: NormalizedItem<T> | null): Result<T> {
  if (!item) {
    return null;
  }

  return {
    item: item.item,
    rowIndex: item.rowIndex,
    flatIndex: item.flatIndex,
    columnIndex: item.columnIndex,
  };
}
