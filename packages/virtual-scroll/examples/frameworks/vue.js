// @ts-check

import { createApp, h, ref } from 'vue'
import { createRecords, getMainMount, prependRecord, reverseRecords, trimRecords } from './shared.js'

/** @typedef {{ id: number, title: string, body: string, width: number }} DemoRecord */

createApp({
  setup() {
    const records = /** @type {{ value: DemoRecord[] }} */ (ref(createRecords(30, 'Vue')))

    const RecordCard = {
      props: ['record'],
      setup(/** @type {{ record: DemoRecord }} */ props) {
        const expanded = ref(false)

        return () =>
          h('article', { class: 'stack-card' }, [
            h('h3', props.record.title),
            h('p', props.record.body),
            expanded.value
              ? h('p', { class: 'child-state-note' }, 'This expansion state belongs to the child component.')
              : null,
            h(
              'button',
              { type: 'button', onClick: () => { expanded.value = !expanded.value } },
              expanded.value ? 'Hide details' : 'Show details',
            ),
          ])
      },
    }

    return () =>
      h('div', [
        h('section', { class: 'hero' }, [
          h('h1', 'Vue'),
          h(
            'p',
            'Render functions keep this example declarative without relying on an in-browser template compiler.',
          ),
        ]),
        h('section', { class: 'chrome layout' }, [
          h('div', { class: 'controls' }, [
            h('button', { type: 'button', onClick: () => { records.value = prependRecord(records.value) } }, 'Prepend'),
            h('button', { type: 'button', onClick: () => { records.value = reverseRecords(records.value) } }, 'Reverse'),
            h('button', { type: 'button', class: 'alt', onClick: () => { records.value = trimRecords(records.value) } }, 'Trim'),
          ]),
          h('div', { class: 'layout' }, [
            h('p', { class: 'caption' }, 'Vue renders the host children declaratively through its render function.'),
            h(
              'virtual-scroll',
              { axis: 'vertical', overscan: '260', class: 'vertical-host' },
              records.value.map((record) => h(RecordCard, { key: record.id, record })),
            ),
          ]),
        ]),
      ])
  },
}).mount(getMainMount())
