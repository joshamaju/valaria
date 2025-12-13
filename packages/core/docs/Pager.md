# Pager

## The Problem

Traditional carousel solutions often come with significant limitations:

- They re-invent the functionality of `overflow: auto`.
- They make incorrect assumptions about what constitutes a "page."
- They are difficult to make responsive.
- They enforce rigid HTML structures.
- They provide a subpar user experience (e.g., mouse wheel behavior is inconsistent with normal scrollable containers).

## The Solution

Modern CSS scroll snap features allow you to create a basic carousel with ease. The `Pager` library complements this by providing the tools to handle the remaining challenges.

## Key benefits

- Pages are dynamically calculated based on the number of items that fit within the visible scroll area. This ensures users don't need to paginate through items already visible on the screen.
- You retain full control over your layout and styling.

## Example Usage

```html
<ul style="overflow-x: auto; display: flex; gap: 1rem; width: 10rem;">
  <li style="flex: 0 0 4rem">1</li>
  <li style="flex: 0 0 4rem">2</li>
  <li style="flex: 0 0 10rem">3</li>
  <li style="flex: 0 0 4rem">4</li>
  <li style="flex: 0 0 4rem">5</li>
</ul>
```

```javascript
import { Pager, DOMDimension } from "kitel/Pager";

const ul = document.querySelector("ul");
const li = ul.querySelectorAll("li");

const pager = new Pager(ul, li, new DOMDimension("horizontal"));

const pages = pager.compute(); // [[li, li], [li], [li, li]]
```

### What is `DOMDimension`?

`DOMDimension` is a browser-based implementation of the `Dimension` API. This allows the `Pager` library to be used in non-browser environments, such as React Native.

For more examples, see the [examples folder](examples/pagination).
