# Virtual Scroll

`<virtual-scroll>` is a custom element that virtualizes only its authored direct children.

It is designed for:

- variable-size children
- normal browser layout for mounted children
- external scroll roots, including `window`
- direct-child host DOM compatibility
- retention for focused or explicitly kept-alive children

## Status

This repo contains:

- the runtime in [src/virtual-scroll-element.ts](/src/virtual-scroll-element.ts)
- browser tests in [test/virtual-scroll.browser.test.ts](/test/virtual-scroll.browser.test.ts)
- runnable examples in [examples](/examples)
- the implementation spec in [spec.md](/spec.md)

## Quick Start

Build the runtime:

```sh
pnpm run build
```

Register the element:

```ts
import { defineVirtualScrollElement } from "./dist/index.js";

defineVirtualScrollElement();
```

Use it in markup:

```html
<virtual-scroll axis="vertical" overscan="400" class="feed">
  <article>Row 1</article>
  <article>Row 2</article>
  <article>Row 3</article>
</virtual-scroll>
```

Author the host layout yourself:

```css
.feed {
  display: block;
  height: 420px;
  overflow-y: auto;
  padding: 12px;
}
```

## Core Rules

- Only direct children are virtualized.
- Direct children may be elements, text nodes, or comment nodes.
- Mounted children remain real direct children of the host.
- The runtime does not set your host `display`, `overflow`, or `white-space`.
- The runtime does not set sizing styles on your children.

## Public API

### `axis`

Controls the active virtualization axis.

- property: `axis`
- attribute: `axis`
- values:
  - `vertical`
  - `horizontal`

Example:

```html
<virtual-scroll axis="horizontal"></virtual-scroll>
```

### `overscan`

Extra main-axis distance kept mounted outside the visible viewport.

- property: `overscan`
- attribute: `overscan`
- unit: CSS pixels

Example:

```html
<virtual-scroll overscan="800"></virtual-scroll>
```

### `scrollRoot`

Overrides which element drives scroll position.

- property: `scrollRoot`
- attribute: `scroll-root`

Attribute values:

- `window`
- CSS selector

Examples:

```html
<virtual-scroll scroll-root="#feed-scroller"></virtual-scroll>
<virtual-scroll scroll-root="window"></virtual-scroll>
```

```ts
host.scrollRoot = document.querySelector("#feed-scroller")!;
```

### `keepAlive`

Programmatic direct-child retention.

Type:

```ts
(child: Node) => boolean;
```

Example:

```ts
host.keepAlive = (child) => {
  return child instanceof Element && child.matches(".editor, .media-playing");
};
```

### `data-keep-alive`

Declarative direct-child retention.

Example:

```html
<virtual-scroll axis="vertical" class="feed">
  <article data-keep-alive>Persistent row</article>
  <article>Virtualized row</article>
</virtual-scroll>
```

## Retention

A direct child stays mounted if any of these are true:

- it contains the active focused descendant
- `keepAlive(child)` returns `true`
- it has `data-keep-alive`

Focus retention wins over `keepAlive(child) === false`.

Retention is only supported at the direct-child boundary.

## Scroll Behavior

If the host is the real scroller:

- host scrolling stays native

If an external scroll root is configured:

- host `scrollTop`
- host `scrollLeft`
- host `scroll()`
- host `scrollTo()`
- host `scrollBy()`

proxy to the resolved scroll root.

Direct-child `scrollIntoView()` is virtualization-aware, including for parked direct children.

## Host DOM Behavior

The host presents a logical direct-child view.

These host APIs work against authored direct children rather than runtime spacer DOM:

- `childNodes`
- `children`
- `firstChild`
- `lastChild`
- `firstElementChild`
- `lastElementChild`
- `childElementCount`
- `appendChild`
- `insertBefore`
- `removeChild`
- `replaceChild`
- `append`
- `prepend`
- `replaceChildren`
- `querySelector`
- `querySelectorAll`
- `innerHTML`

This means:

- spacer nodes are hidden from host-scoped queries
- parked descendants remain queryable through the host
- `:scope > *` behaves like authored direct element children only

## Styling Guidance

For the strongest fidelity:

- size the host explicitly when it is the scroll container
- prefer padding, gaps, or non-collapsing spacing patterns
- avoid relying on collapsed margins between direct children

Exact reconstruction of adjacency-sensitive spacing is not guaranteed.

## Framework Guidance

The host’s direct-child boundary belongs to `virtual-scroll`.

Safer integrations:

- React
- Preact
- Vue
- Solid
- Svelte

For Lit and similar marker-based runtimes, use stable wrapper elements as the direct children of the host and render framework content inside those wrappers.

See [examples/frameworks](/examples/frameworks).

## Examples

Basic examples:

- [basic-vertical.html](/examples/basic-vertical.html)
- [basic-horizontal.html](/examples/basic-horizontal.html)
- [external-scroll-root.html](/examples/external-scroll-root.html)
- [window-scroll-root.html](/examples/window-scroll-root.html)
- [focus-todo.html](/examples/focus-todo.html)
- [infinite-feed.html](/examples/infinite-feed.html)
- [stress-lab.html](/examples/stress-lab.html)

Framework examples:

- [examples/frameworks/index.html](/examples/frameworks/index.html)

## Development

Typecheck:

```sh
pnpm run typecheck
```

Build:

```sh
pnpm run build
```

Run browser tests:

```sh
pnpm run test:browser -- --run
```

## Support Boundaries

Supported well:

- direct-child virtualization
- variable-size children
- external scroll roots
- logical host queries and mutations
- direct-child retention

Out of scope or intentionally limited:

- full descendant-tree virtualization
- generalized virtualization-aware geometry for parked nodes
- full find-in-page support for parked content
- exact collapsed-margin reconstruction
- first-class 2D grid virtualization
