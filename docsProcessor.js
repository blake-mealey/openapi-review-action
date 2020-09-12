'use strict';

const remark = require('remark');
const visit = require('unist-util-visit');
const find = require('unist-util-find');
const is = require('unist-util-is');
const u = require('unist-builder');

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
  visit(tree, { type: 'heading', depth: 2 }, (node, index, parent) => {
    parent.children.splice(
      index + 2,
      0,
      u('html', '<details>\n<summary>Docs</summary>')
    );

    let nextIndex = parent.children
      .slice(index + 2)
      .findIndex((node) => is(node, { type: 'heading', depth: 2 }));
    if (nextIndex === -1) {
      nextIndex = parent.children.length;
    } else {
      nextIndex += index + 2;
    }

    parent.children.splice(nextIndex, 0, u('html', '</details>'));
  });
};

function getOperationLocation(specs, operationId) {
  for (const spec of specs) {
    for (const [route, operations] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (operation.operationId === operationId) {
          return ['paths', route, method].join('.');
        }
      }
    }
  }
}

function findMatchingDifference(diffs, operationLocation) {
  if (!diffs) {
    return;
  }

  return diffs.find(
    (diff) =>
      diff.sourceSpecEntityDetails.find(({ location }) =>
        location.startsWith(operationLocation)
      ) ||
      diff.destinationSpecEntityDetails.find(({ location }) =>
        location.startsWith(operationLocation)
      )
  );
}

const insertChangeNotifier = (specs, specsDiff) => (tree) => {
  visit(tree, { type: 'heading', depth: 2 }, (node, index, parent) => {
    const createNotifierNode = (message, emoji) =>
      u('paragraph', [
        u('text', `${emoji} `),
        u('strong', [u('text', message)]),
        u('text', ` ${emoji}`),
      ]);

    const idNode = parent.children[index + 1].children[0];
    const operationId = idNode.value.match(/"opId(.*)"/)[1];
    const operationLocation = getOperationLocation(specs, operationId);

    let notifierNode;
    if (
      findMatchingDifference(specsDiff.breakingDifferences, operationLocation)
    ) {
      notifierNode = createNotifierNode('BREAKING CHANGES', '🚨');
    } else if (
      findMatchingDifference(
        specsDiff.nonBreakingDifferences,
        operationLocation
      ) ||
      findMatchingDifference(
        specsDiff.unclassifiedDifferences,
        operationLocation
      )
    ) {
      notifierNode = createNotifierNode('CHANGES', '⚠');
    }

    if (notifierNode) {
      parent.children.splice(index + 1, 0, notifierNode);
      return [visit.SKIP, index + 1];
    }
  });
};

module.exports = {
  removeUnwantedNodes,
  wrapOperationsWithDetails,
  insertChangeNotifier,
  process: (contents, specs, specsDiff) =>
    remark()
      .use(removeUnwantedNodes)
      .use(wrapOperationsWithDetails)
      .use(insertChangeNotifier, specs, specsDiff)
      .process(contents),
};
