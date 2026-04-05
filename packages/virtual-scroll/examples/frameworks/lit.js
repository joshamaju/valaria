// @ts-check

import { html, render } from 'lit'
import { createRecords, getMainMount, prependRecord, reverseRecords } from './shared.js'

/** @typedef {{ id: number, title: string, body: string, width: number }} DemoRecord */

const mount = getMainMount()

class LitVsItem extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    /** @type {DemoRecord | null} */
    this._record = null
    this._expanded = false
  }

  /**
   * @param {DemoRecord} value
   */
  set data(value) {
    this._record = value
    this.render()
  }

  /**
   * @returns {DemoRecord | null}
   */
  get data() {
    return this._record
  }

  connectedCallback() {
    this.render()
  }

  toggleExpanded() {
    this._expanded = !this._expanded
    this.render()
  }

  render() {
    const record = this._record
    if (!this.shadowRoot || record == null) {
      return
    }

    render(
      html`
        <style>
          :host {
            display: block;
            margin: 0 0 12px;
          }

          .stack-card {
            margin: 0;
            padding: 1rem 1.1rem;
            border-radius: 16px;
            background: linear-gradient(160deg, #fffefb 0%, #f4ede1 100%);
            border: 1px solid rgba(80, 57, 24, 0.08);
          }

          h3 {
            margin: 0 0 0.5rem;
            font-family: "Space Grotesk", "IBM Plex Sans", sans-serif;
            font-size: 1.1rem;
          }

          p {
            margin: 0;
            line-height: 1.55;
            color: #4b463f;
            font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
          }

          button {
            margin-top: 0.9rem;
            border: 0;
            border-radius: 999px;
            padding: 0.55rem 0.85rem;
            background: #1b5e5a;
            color: #f6f3ee;
            cursor: pointer;
            font: inherit;
          }

          .child-state-note {
            margin-top: 0.8rem;
            padding: 0.7rem 0.85rem;
            border-radius: 12px;
            background: rgba(27, 94, 90, 0.08);
            color: #214946;
          }
        </style>
        <article class="stack-card">
          <h3>${record.title}</h3>
          <p>${record.body}</p>
          ${this._expanded
            ? html`<p class="child-state-note">This expanded state stays inside the stable wrapper element.</p>`
            : null}
          <button type="button" @click=${() => this.toggleExpanded()}>
            ${this._expanded ? 'Hide details' : 'Show details'}
          </button>
        </article>
      `,
      this.shadowRoot,
    )
  }
}

if (!customElements.get('lit-vs-item')) {
  customElements.define('lit-vs-item', LitVsItem)
}

/** @type {DemoRecord[]} */
let records = createRecords(24, 'Lit Wrapper')

/**
 * @returns {HTMLElement}
 */
function getHostElement() {
  const host = mount.querySelector('virtual-scroll')
  if (!(host instanceof HTMLElement)) {
    throw new Error('Expected rendered virtual-scroll host')
  }

  return host
}

function syncHostChildren() {
  const host = getHostElement()
  const existing = new Map(
    Array.from(host.children)
      .filter((node) => node instanceof LitVsItem)
      .map((node) => [node.getAttribute('data-record-id'), node]),
  )

  const wrappers = records.map((record) => {
    const key = String(record.id)
    const wrapper = /** @type {LitVsItem} */ (existing.get(key) ?? document.createElement('lit-vs-item'))
    wrapper.setAttribute('data-record-id', key)
    wrapper.data = record
    return wrapper
  })

  host.replaceChildren(...wrappers)
}

function update() {
  render(
    html`
      <section class="hero">
        <h1>Lit Stable Wrappers</h1>
        <p>
          Lit renders the surrounding shell declaratively, while the virtual-scroll host receives
          stable wrapper elements as its direct children.
        </p>
      </section>
      <section class="chrome layout">
        <div class="controls">
          <button type="button" @click=${() => { records = prependRecord(records); update() }}>Prepend</button>
          <button type="button" class="alt" @click=${() => { records = reverseRecords(records); update() }}>Reverse</button>
        </div>
        <div class="layout">
          <p class="caption">
            Lit does not own the host child boundary here. It owns each wrapper’s internals instead.
          </p>
          <virtual-scroll axis="vertical" overscan="260" class="vertical-host"></virtual-scroll>
        </div>
      </section>
    `,
    mount,
  )

  syncHostChildren()
}

update()
