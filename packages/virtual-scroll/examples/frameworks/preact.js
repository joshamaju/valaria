// @ts-check

import { Fragment, h, render } from 'preact'
import { useState } from 'preact/hooks'
import { createRecords, getMainMount, reverseRecords, rotateRecords, trimRecords } from './shared.js'

/** @typedef {{ id: number, title: string, body: string, width: number }} DemoRecord */

/**
 * @param {{ record: DemoRecord }} props
 */
function ChipCard(props) {
  const [pinned, setPinned] = useState(false)
  const record = props.record

  return h(
    'article',
    {
      className: `chip${pinned ? ' chip-active' : ''}`,
      style: { width: `${record.width}px` },
    },
    h('strong', null, record.title.replace('Record', 'Tile')),
    h(
      'p',
      {
        style: {
          margin: '0',
          fontSize: '0.95rem',
          lineHeight: '1.45',
          fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
        },
      },
      pinned ? 'Pinned locally inside this child.' : 'This chip keeps its own toggle state.',
    ),
    h('button', { type: 'button', onClick: () => setPinned(!pinned) }, pinned ? 'Unpin' : 'Pin'),
  )
}

function App() {
  const [records, setRecords] = /** @type {[DemoRecord[], (value: DemoRecord[]) => void]} */ (
    useState(() => createRecords(24, 'Preact'))
  )

  return h(
    Fragment,
    null,
    h(
      'section',
      { className: 'hero' },
      h('h1', null, 'Preact'),
      h('p', null, 'A declarative horizontal integration with variable-width children and state-driven reordering.'),
    ),
    h(
      'section',
      { className: 'chrome layout' },
      h(
        'div',
        { className: 'controls' },
        h('button', { type: 'button', onClick: () => setRecords(rotateRecords(records)) }, 'Rotate'),
        h('button', { type: 'button', onClick: () => setRecords(reverseRecords(records)) }, 'Reverse'),
        h('button', { type: 'button', onClick: () => setRecords(trimRecords(records)), className: 'alt' }, 'Trim'),
      ),
      h(
        'div',
        { className: 'layout' },
        h('p', { className: 'caption' }, 'Horizontal virtualization with direct children rendered by Preact.'),
        h(
          'virtual-scroll',
          { axis: 'horizontal', overscan: '320', className: 'horizontal-host' },
          records.map((/** @type {DemoRecord} */ record) => h(ChipCard, { key: record.id, record })),
        ),
      ),
    ),
  )
}

render(h(App), getMainMount())
