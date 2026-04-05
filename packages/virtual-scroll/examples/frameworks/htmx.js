// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createCard,
  createExampleShell,
  mountHost,
} from '../shared.js'

/**
 * @typedef {{ process?: (element: Element) => void }} HtmxGlobal
 */

const context = createExampleShell(
  'HTMX',
  'HTMX drives declarative host updates against the virtual-scroll element using append, prepend, and innerHTML swaps.',
)

applyVerticalHostStyles(context.host)
context.host.id = 'htmx-host'
context.host.setAttribute('overscan', '280')

appendMany(
  context.host,
  Array.from({ length: 18 }, (_, index) =>
    createCard(index, 'These initial children were authored before HTMX performs any swaps.'),
  ),
)

context.controls.innerHTML = `
  <button
    type="button"
    hx-get="./fragments/htmx-append.html"
    hx-target="#htmx-host"
    hx-swap="beforeend"
  >
    Append Batch
  </button>
  <button
    type="button"
    class="alt"
    hx-get="./fragments/htmx-prepend.html"
    hx-target="#htmx-host"
    hx-swap="afterbegin"
  >
    Prepend Batch
  </button>
  <button
    type="button"
    hx-get="./fragments/htmx-replace.html"
    hx-target="#htmx-host"
    hx-swap="innerHTML"
  >
    Replace All
  </button>
  <p class="caption">
    The host itself is the HTMX target. Swaps exercise logical direct-child insertion, replacement,
    and ordering without exposing spacer elements.
  </p>
`

mountHost(context, context.host)

const maybeHtmx = /** @type {Window & { htmx?: HtmxGlobal }} */ (window).htmx
maybeHtmx?.process?.(document.body)
