import type { Config, PageItem } from "../Pagination.js";

/** @internal */
type GetPageItemsArgs = {
  page?: number;
  totalPages: number;
  siblingCount?: number;
};

function getPageItems({
  page = 1,
  totalPages,
  siblingCount = 1,
}: GetPageItemsArgs): Array<PageItem> {
  const page_items: Array<PageItem> = [];
  const first_item_with_siblings = 3 + siblingCount;
  const pages_to_show = new Set([1, Math.max(totalPages, 1)]);
  const last_item_with_siblings = totalPages - 2 - siblingCount;

  if (first_item_with_siblings > last_item_with_siblings) {
    for (let p = 2; p <= totalPages - 1; p++) {
      pages_to_show.add(p);
    }
  } else if (page < first_item_with_siblings) {
    for (let p = 2; p <= Math.min(first_item_with_siblings, totalPages); p++) {
      pages_to_show.add(p);
    }
  } else if (page > last_item_with_siblings) {
    for (
      let p = totalPages - 1;
      p >= Math.max(last_item_with_siblings, 2);
      p--
    ) {
      pages_to_show.add(p);
    }
  } else {
    for (
      let p = Math.max(page - siblingCount, 2);
      p <= Math.min(page + siblingCount, totalPages);
      p++
    ) {
      pages_to_show.add(p);
    }
  }

  const addPage = (value: number) => {
    page_items.push({ type: "page", value, key: `page-${value}` });
  };

  const addEllipsis = () => {
    page_items.push({ type: "ellipsis", key: `ellipsis-${page_items.length}` });
  };

  let lastNumber = 0;

  for (const page of Array.from(pages_to_show).sort((a, b) => a - b)) {
    if (page - lastNumber > 1) addEllipsis();
    addPage(page);
    lastNumber = page;
  }

  return page_items;
}

/** @internal */
type NullableKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

/** @internal */
type Defaults<T> = {
  [K in NullableKeys<T>]?: T[K];
};

const defaults = {
  perPage: 1,
  defaultPage: 1,
  siblingCount: 1,
} satisfies Defaults<Config>;

export function createPagination(props: Config) {
  const withDefaults = { ...defaults, ...props } satisfies Config;

  const page = withDefaults.page ?? withDefaults.defaultPage;

  // options
  const options = withDefaults;

  const { perPage, siblingCount, count } = options;

  const totalPages = Math.ceil(count / perPage);

  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, count);
  const range = { start, end };

  const pages = getPageItems({ page, totalPages, siblingCount });

  // const pageTrigger = makeElement(name('page'), {
  //   stores: page,
  //   returned: ($page) => {
  //     return (pageItem: Page) => {
  //       return {
  //         'aria-label': `Page ${pageItem.value}`,
  //         'data-value': pageItem.value,
  //         'data-selected': pageItem.value === $page ? '' : undefined,
  //       } as const;
  //     };
  //   },
  //   action: (
  //     node: HTMLElement
  //   ): MeltActionReturn<PaginationEvents['pageTrigger']> => {
  //     const unsub = executeCallbacks(
  //       addMeltEventListener(node, 'click', () => {
  //         const value = node.dataset.value;
  //         if (!value || Number.isNaN(+value)) return;
  //         page.set(Number(value));
  //       }),
  //       addMeltEventListener(node, 'keydown', keydown)
  //     );

  //     return {
  //       destroy: unsub,
  //     };
  //   },
  // });

  const prev = () => Math.max(page - 1, 1);

  const next = () => Math.min(page + 1, totalPages);

  return { prev, next, states: { page, pages, range, totalPages } };
}
