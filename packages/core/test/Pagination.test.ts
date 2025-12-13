import { test, expect } from "vitest";

import { create, type Config } from "../src/Pagination.js";

test("should create pagination", () => {
  const config: Config = {
    count: 100,
    perPage: 10,
    defaultPage: 1,
    siblingCount: 1,
  };

  let pagination = create(config);

  expect(pagination.states.page).toBe(1);
  expect(pagination.states.range.start).toBe(0);
  expect(pagination.states.range.end).toBe(10);

  pagination = create({ ...config, defaultPage: pagination.next() });

  expect(pagination.states.page).toBe(2);
  expect(pagination.states.range.start).toBe(10);
  expect(pagination.states.range.end).toBe(20);
});

test("should create pagination - 15 per page", () => {
  const config: Config = {
    count: 100,
    perPage: 15,
    defaultPage: 1,
    siblingCount: 1,
  };

  let pagination = create(config);

  expect(pagination.states.page).toBe(1);
  expect(pagination.states.range.start).toBe(0);
  expect(pagination.states.range.end).toBe(15);

  pagination = create({ ...config, defaultPage: pagination.next() });

  expect(pagination.states.page).toBe(2);
  expect(pagination.states.range.start).toBe(15);
  expect(pagination.states.range.end).toBe(30);
});
