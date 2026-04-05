// @ts-check

import { mount } from 'svelte'
import { compile } from 'svelte/compiler'
import { createRecords, getMainMount, prependRecord, rotateRecords, trimRecords } from './shared.js'

const mountPoint = getMainMount()

const source = `
  <script>
    export let initialRecords = [];
    export let prependRecord;
    export let rotateRecords;
    export let trimRecords;

    let details = new Map();
    let records = initialRecords;

    function toggleDetails(id) {
      details.set(id, !details.get(id));
      details = new Map(details);
    }
  </script>

  <section class="hero">
    <h1>Svelte</h1>
    <p>
      This example keeps the host children declarative in Svelte while the custom element owns
      virtualization.
    </p>
  </section>

  <section class="chrome layout">
    <div class="controls">
      <button type="button" on:click={() => records = prependRecord(records)}>Prepend</button>
      <button type="button" on:click={() => records = rotateRecords(records)}>Rotate</button>
      <button type="button" class="alt" on:click={() => records = trimRecords(records)}>Trim</button>
    </div>
    <div class="layout">
      <p class="caption">Svelte renders the direct children declaratively from component state.</p>
      <virtual-scroll axis="vertical" overscan="260" class="vertical-host">
        {#each records as record (record.id)}
          <article class="stack-card">
            <h3>{record.title}</h3>
            <p>{record.body}</p>
            {#if details.get(record.id)}
              <p class="child-state-note">This expanded state is local to the Svelte child item.</p>
            {/if}
            <button type="button" on:click={() => toggleDetails(record.id)}>
              {details.get(record.id) ? 'Hide details' : 'Show details'}
            </button>
          </article>
        {/each}
      </virtual-scroll>
    </div>
  </section>
`

const compiled = compile(source, {
  generate: 'client',
  dev: false,
  css: 'injected',
  filename: 'VirtualScrollSvelteExample.svelte',
})

const componentUrl = URL.createObjectURL(new Blob([compiled.js.code], { type: 'text/javascript' }))

try {
  const module = await import(componentUrl)
  const App = module.default

  mount(App, {
    target: mountPoint,
    props: {
      initialRecords: createRecords(28, 'Svelte'),
      prependRecord,
      rotateRecords,
      trimRecords,
    },
  })
} finally {
  URL.revokeObjectURL(componentUrl)
}
