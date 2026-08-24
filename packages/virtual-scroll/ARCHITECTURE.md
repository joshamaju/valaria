# Architecture

How `<virtual-scroll>` works, at a conceptual level. For installation and API reference, see [README.md](./README.md).

## What it virtualizes

`<virtual-scroll>` virtualizes only its **authored direct children**. Each direct child is a logical row. The runtime keeps a small window of rows mounted in the live DOM and parks the rest detached, so the browser never lays out or paints children that are far offscreen.

The host itself does not scroll content by clipping — it mounts just enough children to fill the visible area plus a configurable buffer, and fills the remaining scroll distance with spacer elements whose sizes match the parked rows they stand in for.

## Logical vs. Physical DOM

Consumers see and interact with the host as if all children were present. The runtime maintains two parallel views:

```text
Logical view (what consumers see)        Physical DOM (what the browser lays out)
┌─────────────────────────────┐          ┌─────────────────────────────┐
│ <virtual-scroll>            │          │ <virtual-scroll>            │
│   <article> Row 0  </article>│          │   <virtual-scroll-spacer/>  │ ← gap before
│   <article> Row 1  </article>│   ═══►   │   <article> Row 2  </article>│ ← offscreen, still rendered
│   <article> Row 2  </article>│          │   <article> Row 3  </article>│ ← visible
│   ...                        │          │   <article> Row 4  </article>│ ← visible
│   <article> Row 99 </article>│          │   <article> Row 5  </article>│ ← offscreen, still rendered
│ </virtual-scroll>            │          │   <virtual-scroll-spacer/>  │ ← gap after
└─────────────────────────────┘          │ </virtual-scroll>           │
                                          └─────────────────────────────┘
                                          + parked children (detached):
                                            Row 0, Row 1, Row 6 … Row 99
```

- **Visible range** — the children currently in the viewport.
- **Rendered range** — visible plus `overscan` in each direction. These are offscreen but still in the DOM and laid out, so they appear instantly when scrolled into view without waiting for a render pass.
- **Parked** — detached nodes held outside the live DOM. They keep their DOM and component state, remain queryable, but cost nothing in layout or paint.

## Spacers

The scroll height (or width, on the horizontal axis) always reflects the full logical child list — not just the mounted slice. Spacer elements carry the main-axis extent of the gaps above and below the mounted range, sized to the accumulated height of the parked children they represent. As you scroll, the visible window shifts; spacers grow and shrink to keep scroll position continuous.

## Measurement

Children are variable-size and do not need to declare their dimensions. The runtime determines each child's main-axis extent with this precedence:

1. **Cached** — a previously measured extent.
2. **Live layout** — the child is currently mounted, so its real bounding rect is read.
3. **Off-screen lane** — the child is parked, so it is moved into a hidden measurement element, measured, then returned to the parking fragment.

The runtime never writes sizing styles onto authored children — they render with whatever CSS the consumer applies. A `ResizeObserver` watches for size changes (host resize, individual child resize) and invalidates affected extents so the next pass re-measures lazily.

## Reconciliation

A single reconciler computes the correct physical DOM state from the current viewport position:

1. Determine the visible range from viewport metrics, expanded by `overscan`.
2. Add any **retained** children (see below) that fall outside that range.
3. Group the resulting index set into contiguous segments of mounted children.
4. Size the spacers flanking each segment.
5. Reorder the physical DOM to match the desired order: park children that left the range, mount children that entered it, and leave everything else in place.

The pass is idempotent — if the DOM already matches the desired state, no mutations happen beyond spacer sizing. All triggers (scroll, resize, DOM mutation, config change, focus) batch into a single microtask so multiple events in one frame produce one reconcile.

## Scroll Roots

Three modes, resolved from the `scrollRoot` property or `scroll-root` attribute:

- **Host (default)** — the host element is the native scroller. Scroll position reads and writes pass straight through.
- **External** — a different element (selected by CSS selector) drives scroll. The host proxies `scrollTop`, `scrollLeft`, and the scroll methods to that element.
- **Window** — the document is the scroller. Same proxying, resolved to `window`.

When the effective scroll root changes, listeners rebind automatically.

## Logical Host DOM

The host presents itself to consumers as if it held all authored children, hiding the spacers and parked nodes. The standard DOM APIs operate on the logical child list:

- **Collections** — `children`, `childNodes`, `firstChild`, `childElementCount`, etc. report logical children only.
- **Mutation** — `appendChild`, `insertBefore`, `removeChild`, `append`, `replaceChildren`, etc. update the logical list and trigger a reconcile.
- **Query** — `querySelector` / `querySelectorAll` walk logical children and their descendants, including parked children, excluding spacers.
- **Markup** — `innerHTML` serializes and parses through the logical view.

This means framework and vanilla code that manipulates the host's children works as expected, unaware that most children are parked.

## Retention

Children outside the rendered range are normally parked. Three mechanisms keep specific children mounted and rendered regardless of position:

- **Focus** — the currently focused child stays mounted so keyboard navigation and focus don't break across the virtual boundary. Focus is latched on `focusin` and restored after the DOM settles.
- **`data-keep-alive`** — a declarative attribute on a direct child marks it as always-mounted.
- **`keepAlive`** — a callback that receives each child and returns whether it should stay mounted.

Retained children produce additional mounted segments with spacers on both sides, so they can sit anywhere in the logical order.

## Lifecycle

- **Connect** — on first connect, the host adopts its authored children, attaches observers, and runs an initial reconcile. On reconnect, it re-resolves config and re-attaches observers; state survives disconnection.
- **Disconnect** — listeners and observers are torn down and timers cancelled. The logical child list and parked nodes persist, so a host can be detached and reattached without losing its virtualization state.

## Framework Guidance

The host's direct-child boundary belongs to `<virtual-scroll>`. Frameworks that own their own rendering tree (React, Preact, Vue, Solid, Svelte) integrate cleanly because the host exposes a stable logical child surface.

For marker-based runtimes like Lit that inject comment nodes or transient markers as direct children, wrap framework content in a stable element that is the direct child of the host, and render framework content inside that wrapper.

See `examples/` in the repository for end-to-end integration samples.
