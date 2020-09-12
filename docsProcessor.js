'use strict';

const remark = require('remark');
const visit = require('unist-util-visit');
const find = require('unist-util-find');
const is = require('unist-util-is');

const removeUnwantedNodes = () => (tree) => {
  visit(tree, 'html', (node, index, parent) => {
    if (node.value.startsWith('<h1')) {
      parent.children.splice(index, 1);
      return [visit.SKIP, index];
    }
  });
  visit(tree, 'blockquote', (node, index, parent) => {
    const text = find(node, { type: 'text' });
    if (text && text.value.startsWith('Scroll down for')) {
      parent.children.splice(index, 1);
      return [visit.SKIP, index];
    }
  });
};

const wrapOperationsWithDetails = () => (tree) => {
  console.log(tree);
  visit(tree, { type: 'heading', depth: 2 }, (node, index, parent) => {
    parent.children.splice(index + 1, 0, {
      type: 'html',
      value: '<details>\n<summary>Description:"</summary>',
    });

    let nextIndex = parent.children
      .slice(index + 1)
      .findIndex((node) => is(node, { type: 'heading', depth: 2 }));
    if (nextIndex === -1) {
      nextIndex = parent.children.length;
    } else {
      nextIndex += index + 1;
    }

    parent.children.splice(nextIndex, 0, {
      type: 'html',
      value: '</details>',
    });
  });
};

const insertChangeNotifier = (specsDiff) => (tree) => {
  visit(tree, { type: 'heading', depth: 2 }, (node, index, parent) => {
    // TODO: Determine which (if any) change notifier to insert

    // ⚠ **CHANGES** ⚠

    parent.children.splice(index + 1, 0, {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          value: '🚨 **BREAKING CHANGES** 🚨',
        },
      ],
    });

    return [visit.SKIP, index + 1];
  });
};

// const fs = require('fs');
// const file = fs.readFileSync('./test.md', { encoding: 'utf-8' });

// const result = remark()
//   .use(removeUnwantedNodes)
//   .use(wrapOperationsWithDetails)
//   .use(insertChangeNotifier);
// .processSync(file);
// console.log(result.contents);

module.exports = {
  removeUnwantedNodes,
  wrapOperationsWithDetails,
  insertChangeNotifier,
  process: (contents, specsDiff) =>
    remark()
      .use(removeUnwantedNodes)
      .use(wrapOperationsWithDetails)
      .use(insertChangeNotifier, specsDiff)
      .process(contents),
};
