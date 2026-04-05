// @ts-check

import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createRecords, getMainMount, prependRecord, rotateRecords, trimRecords } from './shared.js'

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
      ? h('p', { className: 'child-state-note' }, 'This expanded state lives inside the child component.')
      : null,
    h(
      'button',
      { type: 'button', onClick: () => setExpanded(!expanded) },
      expanded ? 'Hide details' : 'Show details',
    ),
  )
}

function App() {
  const [records, setRecords] = /** @type {[DemoRecord[], (value: DemoRecord[]) => void]} */ (
    useState(() => createRecords(34, 'React'))
  )

  return h(
    React.Fragment,
    null,
    h(
      'section',
      { className: 'hero' },
      h('h1', null, 'React'),
      h(
        'p',
        null,
        'This example keeps the host children declarative in React and updates them through state only.',
      ),
    ),
    h(
      'section',
      { className: 'chrome layout' },
      h(
        'div',
        { className: 'controls' },
        h('button', { type: 'button', onClick: () => setRecords(prependRecord(records)) }, 'Prepend'),
        h('button', { type: 'button', onClick: () => setRecords(rotateRecords(records)) }, 'Rotate'),
        h('button', { type: 'button', onClick: () => setRecords(trimRecords(records)), className: 'alt' }, 'Trim'),
      ),
      h(
        'div',
        { className: 'layout' },
        h('p', { className: 'caption' }, 'Host-scrolled vertical virtualization rendered from React state.'),
        h(
          'virtual-scroll',
          { axis: 'vertical', overscan: '260', className: 'vertical-host' },
          records.map((/** @type {DemoRecord} */ record) => h(RecordCard, { key: record.id, record })),
        ),
      ),
    ),
  )
}

createRoot(getMainMount()).render(h(App))
