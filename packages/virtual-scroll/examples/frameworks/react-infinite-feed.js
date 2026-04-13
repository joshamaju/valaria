// @ts-check

import React from 'react'
import { createRoot } from 'react-dom/client'
import { getMainMount } from './shared.js'

/** @typedef {{ id: number, title: string, body: string, imageUrl: string | null }} FeedRecord */

const h = React.createElement
const PAGE_SIZE = 8
const MAX_PAGES = 5
const LOAD_THRESHOLD = 640

/**
 * @param {number} index
 * @returns {FeedRecord}
 */
function createFeedRecord(index) {
  const imageUrl =
    index % 3 === 1
      ? `https://picsum.photos/seed/react-infinite-${index + 1}/960/720`
      : null

  return {
    id: index + 1,
    title: `React Feed Story ${index + 1}`,
    body: [
      'This page keeps pagination logic in React state while the custom element owns virtualization.',
      index % 2 === 0
        ? 'The row is text-heavy to vary its height during scroll.'
        : 'This row is more compact so the mounted geometry stays mixed.',
      imageUrl
        ? 'A remote image adds real loading behavior and mounted-child resize pressure.'
        : 'There is no image in this card, so the next row will have a different footprint.',
    ].join(' '),
    imageUrl,
  }
}

/**
 * @param {number} start
 * @param {number} count
 * @returns {FeedRecord[]}
 */
function createPage(start, count) {
  return Array.from({ length: count }, (_, offset) => createFeedRecord(start + offset))
}

/**
 * @param {{ record: FeedRecord }} props
 */
function FeedCard(props) {
  const [expanded, setExpanded] = React.useState(false)
  const { record } = props

  return h(
    'article',
    { className: record.imageUrl ? 'media-card' : 'stack-card' },
    record.imageUrl
      ? h(
          React.Fragment,
          null,
          h(
            'figure',
            { className: 'media-card__figure' },
            h('img', {
              className: 'media-card__image',
              src: record.imageUrl,
              alt: record.title,
              width: 960,
              height: 720,
              loading: 'lazy',
            }),
          ),
          h(
            'div',
            { className: 'media-card__body' },
            h(
              'div',
              { className: 'media-card__eyebrow' },
              h('span', { className: 'media-pill' }, 'React'),
              h('span', { className: 'media-pill media-pill--alt' }, 'Infinite Feed'),
            ),
            h('h3', null, record.title),
            h('p', null, record.body),
            expanded
              ? h(
                  'p',
                  { className: 'child-state-note' },
                  'This child keeps its own expanded state while the feed grows declaratively.',
                )
              : null,
            h(
              'button',
              { type: 'button', onClick: () => setExpanded(!expanded) },
              expanded ? 'Hide details' : 'Show details',
            ),
          ),
        )
      : h(
          React.Fragment,
          null,
          h('h3', null, record.title),
          h('p', null, record.body),
          expanded
            ? h(
                'p',
                { className: 'child-state-note' },
                'This expanded note lives inside the child component while the parent feed keeps loading.',
              )
            : null,
          h(
            'button',
            { type: 'button', onClick: () => setExpanded(!expanded) },
            expanded ? 'Hide details' : 'Show details',
          ),
        ),
  )
}

function App() {
  const hostRef = React.useRef(/** @type {HTMLElement | null} */ (null))
  const [records, setRecords] = /** @type {[FeedRecord[], (value: FeedRecord[] | ((value: FeedRecord[]) => FeedRecord[])) => void]} */ (
    React.useState(() => createPage(0, PAGE_SIZE))
  )
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [ended, setEnded] = React.useState(false)

  React.useEffect(() => {
    if (!loading) {
      return
    }

    const timer = window.setTimeout(() => {
      React.startTransition(() => {
        setRecords((/** @type {FeedRecord[]} */ current) => [...current, ...createPage(current.length, PAGE_SIZE)])
        setPage((/** @type {number} */ current) => current + 1)
        setLoading(false)
      })
    }, 650)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loading])

  React.useEffect(() => {
    if (page >= MAX_PAGES && !loading) {
      setEnded(true)
    }
  }, [loading, page])

  /** @returns {void} */
  function maybeLoadMore() {
    const host = hostRef.current
    if (!(host instanceof HTMLElement) || loading || ended) {
      return
    }

    const remaining = host.scrollHeight - (host.scrollTop + host.clientHeight)
    if (remaining <= LOAD_THRESHOLD) {
      setLoading(true)
    }
  }

  /** @returns {void} */
  function resetFeed() {
    React.startTransition(() => {
      setRecords(createPage(0, PAGE_SIZE))
      setPage(1)
      setLoading(false)
      setEnded(false)
    })

    window.setTimeout(() => {
      hostRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    }, 0)
  }

  const status = ended
    ? `Loaded ${records.length} items across ${page} pages. End reached.`
    : loading
      ? `Loaded ${records.length} items across ${page} pages. Fetching next page...`
      : `Loaded ${records.length} items across ${page} pages. Scroll near the bottom to fetch more.`

  return h(
    React.Fragment,
    null,
    h(
      'section',
      { className: 'hero' },
      h('h1', null, 'React Infinite Feed'),
      h(
        'p',
        null,
        'Pagination state stays in React while the custom element virtualizes the direct children. The feed mixes text-heavy cards with remote-image cards.',
      ),
    ),
    h(
      'section',
      { className: 'chrome layout' },
      h(
        'div',
        { className: 'controls' },
        h('button', { type: 'button', onClick: resetFeed, className: 'alt' }, 'Reset Feed'),
        h('output', null, status),
      ),
      h(
        'div',
        { className: 'layout' },
        h(
          'p',
          { className: 'caption' },
          'Host-scrolled infinite feed rendered declaratively from React state.',
        ),
        h(
          'virtual-scroll',
          {
            ref: hostRef,
            axis: 'vertical',
            overscan: '320',
            className: 'vertical-host',
            onScroll: maybeLoadMore,
          },
          records.map((record) => h(FeedCard, { key: record.id, record })),
        ),
      ),
    ),
  )
}

createRoot(getMainMount()).render(h(App))
