// @ts-check

import {
  applyVerticalHostStyles,
  createCard,
  createExampleShell,
  mountHost,
} from "./shared.js";

const context = createExampleShell(
  "Text And Comments",
  "A mixed direct-child host containing element, text, and comment nodes.",
);

applyVerticalHostStyles(context.host);
context.host.setAttribute("overscan", "180");

for (let index = 0; index < 20; index += 1) {
  context.host.append(
    createCard(index + 0, "The next logical child is a raw text node."),
  );
  context.host.append(
    document.createTextNode(
      "This is a direct text child. Its measured contribution should come from Range.getBoundingClientRect().",
    ),
  );
  context.host.append(
    document.createComment(
      `${index}: Runtime should preserve logical ordering for comment children too.`,
    ),
  );
  context.host.append(
    createCard(index + 1, "This card lands after the text and comment nodes."),
  );
  context.host.append(
    createCard(
      index + 2,
      "The example makes mixed node types visible in one host.",
    ),
  );
}

mountHost(context, context.host);
