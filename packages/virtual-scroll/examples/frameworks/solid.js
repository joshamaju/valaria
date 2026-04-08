// @ts-check

import { createSignal } from 'solid-js'
import html from 'solid-js/html'
import { render } from 'solid-js/web'
import { createRecords, getMainMount, prependRecord, rotateRecords, trimRecords } from './shared.js'

/** @typedef {{ id: number, title: string, body: string, width: number }} DemoRecord */

/**
 * @param {{ record: DemoRecord }} props
 */
function RecordCard(props) {
  const [expanded, setExpanded] = createSignal(false)

  return html`
    <article class="stack-card">
      <h3>${props.record.title}</h3>
      <p>${props.record.body}</p>
      ${() =>
        expanded()
          ? html`<p class="child-state-note">This expansion state is owned by the child component.</p>`
          : ''}
      <button type="button" onClick=${() => setExpanded(!expanded())}>
        ${() => (expanded() ? 'Hide details' : 'Show details')}
      </button>
    </article>
  `
}

function App() {
  const [records, setRecords] = /** @type {[() => DemoRecord[], (value: DemoRecord[]) => void]} */ (
    createSignal(createRecords(28, 'Solid'))
  )

  return html`
    <section class="hero">
      <h1>Solid</h1>
      <p>Signal updates replace the child array declaratively while the custom element handles virtualization.</p>
    </section>
    <section class="chrome layout">
      <div class="controls">
        <button type="button" onClick=${() => setRecords(prependRecord(records()))}>Prepend</button>
        <button type="button" onClick=${() => setRecords(rotateRecords(records()))}>Rotate</button>
        <button type="button" class="alt" onClick=${() => setRecords(trimRecords(records()))}>Trim</button>
      </div>
      <div class="layout">
        <p class="caption">Solid keeps the host children declarative without imperative DOM insertion.</p>
        <virtual-scroll axis="vertical" overscan="260" class="vertical-host">
          ${() =>
            records().map((/** @type {DemoRecord} */ record) => html`
              <${RecordCard} record=${record} />
            `)}
        </virtual-scroll>
      </div>
    </section>
  `
}

render(App, getMainMount())
