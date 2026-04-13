// @ts-check

/**
 * @typedef {{
 *   id: number
 *   title: string
 *   body: string
 *   width: number
 * }} DemoRecord
 */

/**
 * @param {number} index
 * @param {string} label
 * @returns {DemoRecord}
 */
function makeRecord(index, label) {
  return {
    id: index + 1,
    title: `${label} Record ${index + 1}`,
    body: [
      `${label} keeps direct children declarative while the custom element owns virtualization.`,
      'Each child still participates in native layout once mounted.',
      `Row ${index + 1} varies its content to force non-uniform sizing.`,
    ].join(' '),
    width: 180 + (index % 5) * 56,
  }
}

/**
 * @param {number} count
 * @param {string} label
 * @returns {DemoRecord[]}
 */
export function createRecords(count, label) {
  return Array.from({ length: count }, (_, index) => makeRecord(index, label))
}

/**
 * @param {DemoRecord[]} records
 * @returns {DemoRecord[]}
 */
export function prependRecord(records) {
  const nextId = records.reduce((max, record) => Math.max(max, record.id), 0) + 1
  return [makeRecord(nextId - 1, 'Prepended'), ...records]
}

/**
 * @param {DemoRecord[]} records
 * @returns {DemoRecord[]}
 */
export function rotateRecords(records) {
  if (records.length < 2) {
    return [...records]
  }

  return [...records.slice(1), records[0]]
}

/**
 * @param {DemoRecord[]} records
 * @returns {DemoRecord[]}
 */
export function reverseRecords(records) {
  return [...records].reverse()
}

/**
 * @param {DemoRecord[]} records
 * @returns {DemoRecord[]}
 */
export function trimRecords(records) {
  if (records.length <= 8) {
    return [...records]
  }

  return records.slice(0, records.length - 4)
}

/**
 * @returns {HTMLElement}
 */
export function getMainMount() {
  const main = document.querySelector('main')
  if (!(main instanceof HTMLElement)) {
    throw new Error('Expected a <main> element')
  }

  return main
}
