# @valaria/virtual-scroll

`<virtual-scroll>` is a custom element that virtualizes only its authored direct children while preserving a logical host DOM view.

It is designed for:

- variable-size children
- normal browser layout for mounted children
- external scroll roots, including `window`
- direct-child host DOM compatibility
- retention for focused or explicitly kept-alive children

## Installation

```sh
pnpm add @valaria/virtual-scroll
```

## Quick Start

Register the element once during app startup:

```ts
import { defineVirtualScrollElement } from '@valaria/virtual-scroll'

defineVirtualScrollElement()
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

## Public API

### `axis`

Controls the active virtualization axis.

- property: `axis`
- attribute: `axis`
- values: `vertical`, `horizontal`

### `overscan`

Extra main-axis distance kept mounted outside the visible viewport.

- property: `overscan`
- attribute: `overscan`
- unit: CSS pixels

### `scrollRoot`

Overrides which element drives scroll position.

- property: `scrollRoot`
- attribute: `scroll-root`
- attribute values: `window` or a CSS selector

Example:

```ts
const host = document.querySelector('virtual-scroll')!
host.scrollRoot = document.querySelector('#feed-scroller')!
```

### `keepAlive`

Programmatic direct-child retention.

```ts
host.keepAlive = (child) => {
  return child instanceof Element && child.matches('.editor, .media-playing')
}
```

### `data-keep-alive`

Declarative direct-child retention for a direct child.

```html
<virtual-scroll axis="vertical" class="feed">
  <article data-keep-alive>Persistent row</article>
  <article>Virtualized row</article>
</virtual-scroll>
```

## Host DOM Behavior

The host presents a logical direct-child view. These host APIs operate on authored direct children rather than runtime spacer DOM:

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

## Scroll Behavior

If the host is the real scroller, scrolling stays native. If an external scroll root is configured, the host proxies `scrollTop`, `scrollLeft`, `scroll()`, `scrollTo()`, and `scrollBy()` to the resolved scroll root.

Direct-child `scrollIntoView()` is virtualization-aware, including for parked direct children.

## Framework Guidance

The host's direct-child boundary belongs to `virtual-scroll`.

Safer integrations:

- React
- Preact
- Vue
- Solid
- Svelte

For Lit and similar marker-based runtimes, use stable wrapper elements as the direct children of the host and render framework content inside those wrappers.

See `examples/` in the repository for end-to-end integration samples.
