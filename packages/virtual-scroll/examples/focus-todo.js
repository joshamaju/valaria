// @ts-check

import {
  applyVerticalHostStyles,
  createButton,
  createExampleShell,
  mountHost,
} from "./shared.js";

const context = createExampleShell(
  "Retention Modes",
  "Shows focus retention, declarative data-keep-alive retention, and programmable keepAlive retention on direct children.",
);

const notice = document.createElement("div");
notice.className = "notice";
notice.textContent =
  "Focus a field, scroll away, and that direct child stays mounted. Two other rows are retained by data-keep-alive and keepAlive(child).";
context.outlet.append(notice);

const status = document.createElement("output");
status.className = "caption";
status.value = "Waiting for retention demo.";
context.controls.append(status);

applyVerticalHostStyles(context.host);
context.host.setAttribute("overscan", "100");
context.host.keepAlive = (/** @type {Node} */ child) =>
  child instanceof Element &&
  child.classList.contains("programmatic-keep-alive");

/**
 * @param {Element} row
 * @param {() => void} onMounted
 */
function whenRowMounted(row, onMounted) {
  let attempts = 0;

  const tick = () => {
    if (row.parentNode === context.host) {
      onMounted();
      return;
    }

    attempts += 1;
    if (attempts < 30) {
      requestAnimationFrame(tick);
    }
  };

  tick();
}

function runFocusRetentionDemo() {
  const row = context.host.lastElementChild;
  if (!(row instanceof Element)) {
    return;
  }

  status.value = "Preparing the last row for focus retention.";
  row.scrollIntoView({ block: "start", behavior: "instant" });
  whenRowMounted(row, () => {
    const target = row.querySelector("input");
    if (target instanceof HTMLInputElement) {
      target.focus({ preventScroll: true });
      window.setTimeout(() => {
        context.host.scrollTo({ top: 0, behavior: "instant" });
      }, 80);
    }
  });
}

function readRetainedHeadings() {
  return Array.from(
    context.host.querySelectorAll('[data-virtual-scroll-retained="true"] h3'),
  )
    .map((heading) => heading.textContent?.trim() ?? "")
    .filter(Boolean);
}

function updateStatus() {
  const activeElement = document.activeElement;
  const retained = readRetainedHeadings().join(", ") || "none";
  const activeLabel =
    activeElement instanceof HTMLInputElement
      ? activeElement.value
      : activeElement instanceof HTMLElement
        ? activeElement.tagName
        : "none";

  status.value =
    `active: ${activeLabel} | retained: ${retained} | range: ` +
    `${context.host.getAttribute("data-virtual-scroll-mounted-start") ?? "?"}..` +
    `${context.host.getAttribute("data-virtual-scroll-mounted-end") ?? "?"}`;
}

for (let index = 0; index < 18; index += 1) {
  const item = document.createElement("article");
  item.className = "stack-card";
  item.innerHTML = `
    <h3>Retained Child ${index + 1}</h3>
    <p>Direct-child retention is resolved at the host boundary.</p>
  `;

  if (index === 7) {
    item.setAttribute("data-keep-alive", "");
    const badge = document.createElement("div");
    badge.className = "child-state-note";
    badge.textContent =
      "This row is retained declaratively via data-keep-alive.";
    item.append(badge);
  }

  if (index === 12) {
    item.classList.add("programmatic-keep-alive");
    const badge = document.createElement("div");
    badge.className = "child-state-note";
    badge.textContent = "This row is retained by host.keepAlive(child).";
    item.append(badge);
  }

  const input = document.createElement("input");
  input.value = `Editable field ${index + 1}`;
  item.append(input);
  context.host.append(item);
}

const focusAndScrollButton = createButton("Focus Last Then Scroll Top", () => {
  runFocusRetentionDemo();
});
focusAndScrollButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
});

// context.controls.append(
//   createButton('Scroll Top', () => {
//     context.host.scrollTo({ top: 0, behavior: 'smooth' })
//   }),
//   createButton('Scroll Down 500', () => {
//     context.host.scrollBy({ top: 500, behavior: 'smooth' })
//   }),
//   focusAndScrollButton,
//   createButton(
//     'Focus Last Input',
//     () => {
//       const row = context.host.lastElementChild
//       if (row instanceof Element) {
//         row.scrollIntoView({ block: 'start', behavior: 'smooth' })
//         whenRowMounted(row, () => {
//           const target = row.querySelector('input')
//           if (target instanceof HTMLInputElement) {
//             target.focus({ preventScroll: true })
//           }
//         })
//       }
//     },
//     'alt',
//   ),
// )

mountHost(context, context.host);

context.host.addEventListener("rangechange", updateStatus);
document.addEventListener("focusin", updateStatus);
document.addEventListener("focusout", () => {
  window.setTimeout(updateStatus, 0);
});
updateStatus();

// window.setTimeout(() => {
//   runFocusRetentionDemo();
//   window.setTimeout(updateStatus, 260);
// }, 700);
