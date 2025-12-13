import { expect, test } from "@playwright/test";

import {
  type Dimension,
  getIntersectionRatio,
  Pager,
  type Rect,
} from "../../src/Pager.js";

import html_1 from "./fixtures/1-per-page.js";
import html_2 from "./fixtures/2-per-page.js";
import html_vary from "./fixtures/vary-per-page.js";

class DOMDimension implements Dimension {
  constructor(private orientation?: "horizontal" | "vertical") {}

  measure(rect: DOMRect): Rect {
    const dir = this.orientation;
    const start = rect[dir == "horizontal" ? "left" : "top"];
    const end = rect[dir == "horizontal" ? "right" : "bottom"];
    const size = rect[dir == "horizontal" ? "width" : "height"];
    return { start, end, size };
  }
}

test("should produce 1 items per page", async ({ page }) => {
  await page.setContent(html_1);

  const list = page.locator("ul");
  const items = await list?.locator("li").all();

  const ul = await list.evaluate((_) => _.getBoundingClientRect());

  const li = await Promise.all(
    items.map((_) => _.evaluate((_) => _.getBoundingClientRect())),
  );

  const pager = new Pager<DOMRect>(ul, li, new DOMDimension("horizontal"));

  const pages = pager.compute();

  expect(pages.length).toBe(6);
  expect(pages[0].length).toBe(1);
  expect(pages[1].length).toBe(1);
  expect(pages[2].length).toBe(1);
  expect(pages[3].length).toBe(1);
  expect(pages[4].length).toBe(1);
  expect(pages[5].length).toBe(1);
});

test("should produce 2 items per page", async ({ page }) => {
  await page.setContent(html_2);

  const list = page.locator("ul");
  const items = await list?.locator("li").all();

  const ul = await list.evaluate((_) => _.getBoundingClientRect());

  const li = await Promise.all(
    items.map((_) => _.evaluate((_) => _.getBoundingClientRect())),
  );

  const pager = new Pager<DOMRect>(ul, li, new DOMDimension("horizontal"));

  const pages = pager.compute();

  expect(pages.length).toBe(3);
  expect(pages[0].length).toBe(2);
  expect(pages[1].length).toBe(2);
  expect(pages[2].length).toBe(2);
});

test("should produce dynamic number of items per page", async ({ page }) => {
  await page.setContent(html_vary);

  const list = page.locator("ul");
  const items = await list?.locator("li").all();

  const ul = await list.evaluate((_) => _.getBoundingClientRect());

  const li = await Promise.all(
    items.map((_) => _.evaluate((_) => _.getBoundingClientRect())),
  );

  const pager = new Pager<DOMRect>(ul, li, new DOMDimension("horizontal"));

  const pages = pager.compute();

  expect(pages.length).toBe(5);
  expect(pages[0].length).toBe(2);
  expect(pages[1].length).toBe(1);
  expect(pages[2].length).toBe(1);
  expect(pages[3].length).toBe(1);
  expect(pages[4].length).toBe(1);
});

test("should determine visible section - one", async ({ page }) => {
  await page.setContent(html_1);

  const list = page.locator("ul");
  const items = await list?.locator("li").all();

  const ul = await list.evaluate((_) => _.getBoundingClientRect());

  const li = await Promise.all(
    items.map((_) => _.evaluate((_) => _.getBoundingClientRect())),
  );

  const dim = new DOMDimension("horizontal");
  const ratios = li.map((_) => getIntersectionRatio(_, ul, dim));

  const [item] = li;

  expect(ratios[0]).toBe(item.width);
  expect(ratios[1]).toBe(0);
  expect(ratios[2]).toBe(0);
  expect(ratios[3]).toBe(0);
  expect(ratios[4]).toBe(0);
  expect(ratios[5]).toBe(0);
});

test("should determine visible section - two", async ({ page }) => {
  await page.setContent(html_2);

  const list = page.locator("ul");
  const items = await list?.locator("li").all();

  const ul = await list.evaluate((_) => _.getBoundingClientRect());

  const li = await Promise.all(
    items.map((_) => _.evaluate((_) => _.getBoundingClientRect())),
  );

  const dim = new DOMDimension("horizontal");
  const ratios = li.map((_) => getIntersectionRatio(_, ul, dim));

  const [first, second] = li;

  expect(ratios[0]).toBe(first.width);
  expect(ratios[1]).toBe(second.width);
  expect(ratios[2]).toBe(0);
  expect(ratios[3]).toBe(0);
  expect(ratios[4]).toBe(0);
  expect(ratios[5]).toBe(0);
});
