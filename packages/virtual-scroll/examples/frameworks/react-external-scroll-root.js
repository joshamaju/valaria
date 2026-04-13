// @ts-check

import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createRecords, getMainMount, prependRecord, reverseRecords } from './shared.js'

/** @typedef {{ id: number, title: string, body: string, width: number }} DemoRecord */

const h = React.createElement

/**
 * @param {{ record: DemoRecord }} props
 */
function RecordCard(props) {
  const [expanded, setExpanded] = useState(false)
  const record = props.record

  return h(
    'article',
    { className: 'stack-card' },
    h('h3', null, record.title),
    h('p', null, record.body),
    expanded
      ? h('p', { className: 'child-state-note' }, 'This local state belongs to the item, not the list shell.')
      : null,
    h(
      'button',
      { type: 'button', onClick: () => setExpanded(!expanded) },
      expanded ? 'Collapse' : 'Expand',
    ),
  )
}

function App() {
  const [records, setRecords] = /** @type {[DemoRecord[], (value: DemoRecord[]) => void]} */ (
    useState(() => createRecords(26, 'React External'))
  )

  return h(
    React.Fragment,
    null,
    h(
      'section',
      { className: 'hero' },
      h('h1', null, 'React External Scroll Root'),
      h(
        'p',
        null,
        'The framework still renders direct children declaratively while an outer panel owns scrolling.',
      ),
    ),
    h(
      'section',
      { className: 'chrome layout' },
      h(
        'div',
        { className: 'controls' },
        h('button', { type: 'button', onClick: () => setRecords(prependRecord(records)) }, 'Prepend'),
        h('button', { type: 'button', onClick: () => setRecords(reverseRecords(records)), className: 'alt' }, 'Reverse'),
      ),
      h(
        'div',
        { className: 'layout' },
        h(
          'section',
          { id: 'react-framework-external-root', className: 'external-scroll-root' },
          h('div', { className: 'notice' }, 'Scroll this panel. The virtual-scroll host itself is not the scroller.'),
          h('div', { style: { height: '260px' } }),
          h(
            'virtual-scroll',
            {
              axis: 'vertical',
              overscan: '220',
              'scroll-root': '#react-framework-external-root',
              style: { display: 'block', padding: '12px' },
            },
            records.map((/** @type {DemoRecord} */ record) => h(RecordCard, { key: record.id, record })),
          ),
        ),
      ),
    ),
  )
}

createRoot(getMainMount()).render(h(App))
