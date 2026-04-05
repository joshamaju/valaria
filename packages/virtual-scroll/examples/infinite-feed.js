// @ts-check

import {
  appendMany,
  applyVerticalHostStyles,
  createButton,
  createCard,
  createExampleShell,
  createRemoteMediaCard,
  mountHost,
} from './shared.js'

const PAGE_SIZE = 10
const MAX_PAGES = 5
const LOAD_THRESHOLD = 640

const context = createExampleShell(
  'Infinite Feed',
  'A host-scrolled feed that appends the next page near the bottom, mixing text cards with remote-image cards under simulated network loading.',
)

applyVerticalHostStyles(context.host)
context.host.setAttribute('overscan', '320')

let page = 0
let loading = false
let ended = false
let nextIndex = 0

const status = document.createElement('output')

const loadingRow = document.createElement('article')
loadingRow.className = 'stack-card notice'
loadingRow.hidden = true
loadingRow.innerHTML = `
  <h3>Loading next page</h3>
  <p>The feed is simulating a network request before appending the next batch.</p>
`

const endRow = document.createElement('article')
endRow.className = 'stack-card notice'
endRow.hidden = true
endRow.innerHTML = `
  <h3>End of feed</h3>
  <p>All demo pages have been loaded. The host keeps virtualizing the accumulated content.</p>
`

/**
 * @param {number} start
 * @param {number} count
 * @returns {HTMLElement[]}
 */
function createPageItems(start, count) {
  return Array.from({ length: count }, (_, offset) => {
    const index = start + offset
    if (index % 4 === 2) {
      return createRemoteMediaCard(index)
    }

    const extra = [
      'Short update.',
      'A denser paragraph introduces a slightly taller card and changes the mounted geometry.',
      'This feed item includes extra copy so the example exercises variable-height batch appends during scroll.',
      'This item is compact again, which keeps the rhythm mixed and makes overscan behavior easier to inspect.',
    ][index % 4]

    const card = createCard(index, extra)
    if (index % 3 === 1) {
      const note = document.createElement('p')
      note.className = 'child-state-note'
      note.textContent = 'Feed metadata: network-delivered batch, stable node identity, variable copy length.'
      card.append(note)
    }
    return card
  })
}

function updateStatus() {
  const loaded = page * PAGE_SIZE
  status.textContent = ended
    ? `Loaded ${loaded} items across ${page} pages. End reached.`
    : loading
      ? `Loaded ${loaded} items across ${page} pages. Fetching next page...`
      : `Loaded ${loaded} items across ${page} pages. Scroll near the bottom to fetch more.`
}

async function loadNextPage() {
  if (loading || ended) {
    return
  }

  loading = true
  loadingRow.hidden = false
  updateStatus()

  await new Promise((resolve) => window.setTimeout(resolve, 650))

  const items = createPageItems(nextIndex, PAGE_SIZE)
  nextIndex += PAGE_SIZE
  page += 1
  appendMany(context.host, items)

  loading = false
  loadingRow.hidden = true

  if (page >= MAX_PAGES) {
    ended = true
    endRow.hidden = false
  }

  updateStatus()
}

function maybeLoadMore() {
  if (loading || ended) {
    return
  }

  const remaining = context.host.scrollHeight - (context.host.scrollTop + context.host.clientHeight)
  if (remaining <= LOAD_THRESHOLD) {
    void loadNextPage()
  }
}

const resetButton = createButton(
  'Reset Feed',
  () => {
    loading = false
    ended = false
    page = 0
    nextIndex = 0
    loadingRow.hidden = true
    endRow.hidden = true
    context.host.replaceChildren()
    void loadNextPage()
  },
  'alt',
)

context.controls.append(resetButton, status)
context.host.addEventListener('scroll', maybeLoadMore)

mountHost(context, context.host)
context.outlet.append(loadingRow, endRow)

updateStatus()
void loadNextPage()
