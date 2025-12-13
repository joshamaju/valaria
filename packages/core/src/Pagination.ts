/**
 * @since 0.0.1
 */
import * as core from "./core/pagination.js";

/**
 * @since 0.0.1
 * @category model
 */
export type Page = {
  type: "page";
  value: number;
};

/**
 * @since 0.0.1
 * @category model
 */
export type Ellipsis = {
  type: "ellipsis";
};

/**
 * @since 0.0.1
 * @category model
 */
export type PageItem = (Page | Ellipsis) & {
  /** Unique key for the item */
  key: string;
};

/**
 * @since 0.0.1
 * @category model
 */
export type Config = {
  /**
   * The total number of items to be paginated.
   */
  count: number;

  /**
   * Number of items per page
   *
   * @default 1
   */
  perPage?: number;

  /**
   * Number of visible items before and after the current page
   *
   * @default 1
   */
  siblingCount?: number;

  /**
   * The uncontrolled default page of the pagination.
   *
   * @default 1
   */
  defaultPage?: number;

  /**
   * The controlled page store for the pagination.
   * If provided, this will override the value passed to `defaultPage`.
   *
   * @see https://melt-ui.com/docs/controlled#bring-your-own-store
   */
  page?: number;
};

/**
 * @since 0.0.1
 * @category model
 */
export type Pagination = {
  prev: () => number;
  next: () => number;
  states: {
    page: number;
    pages: PageItem[];
    totalPages: number;
    range: { start: number; end: number };
  };
};

/**
 * @since 0.0.1
 * @category constructor
 */
export const create: (config: Config) => Pagination = core.createPagination;
