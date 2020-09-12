'use strict';

const { promises: fs } = require('fs');

const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');
const glob = require('glob');
const diff = require('what-the-diff');
const openapiDiff = require('openapi-diff');

const converter = require('widdershins');
const { promisify } = require('util');

function getOctokit() {
  return github.getOctokit(core.getInput('github-token', { required: true }));
}

function getPullRequest() {
  return github.context.payload.pull_request;
}

function getConverterOptions() {
  return {
    headings: 3,
    ...(core.getInput('converter-options') || {}),
  };
}

function failOnBreakingChanges(specPath, specsDiff) {
  let shouldFail = core.getInput('fail-on-breaking-changes');
  if (!shouldFail && shouldFail !== false) {
    shouldFail = true;
  }

  if (specsDiff.breakingDifferencesFound && shouldFail) {
    core.setFailed(
      new Error(
        `Breaking changes were found in ${specPath}:\n${JSON.stringify(
          specsDiff,
          null,
          2
        )}`
      )
    );
  }
}

async function parseFile(specPath) {
  const data = await fs.readFile(specPath, 'utf-8');
  return yaml.safeLoad(data);
}

async function processSpec(specPath) {
  console.log('processing', specPath);

  const spec = await parseFile(specPath);

  let docs = await converter.convert(spec, getConverterOptions());

  // TODO: Use remark to modify the document in a more robust way
  docs = docs.substring(docs.indexOf('---', 3) + 3);
  docs = docs.replace(/> Scroll down for code samples.*/g, '');
  docs = docs.replace(/^<h1.*<\/h1>$/g, '');

  const specVersions = await getSpecVersions(specPath.replace(/^\.\//, ''));

  const specsDiff = await openapiDiff.diffSpecs(specVersions);
  failOnBreakingChanges(specPath, specsDiff);

  const comment = `
# OpenAPI Review Action

> **Spec: ${specPath}**

## Diff results:

${
  specsDiff.breakingDifferencesFound
    ? `\`\`\`diff
- !! Breaking changes !!
\`\`\``
    : ''
}

* Breaking changes: ${
    specsDiff.breakingDifferences ? specsDiff.breakingDifferences.length : 0
  }
* Non-breaking changes: ${
    specsDiff.nonBreakingDifferences
      ? specsDiff.nonBreakingDifferences.length
      : 0
  }
* Unclassified changes: ${
    specsDiff.unclassifiedDifferences
      ? specsDiff.unclassifiedDifferences.length
      : 0
  }

<details>
<summary>Details</summary>

\`\`\`json
${JSON.stringify(specsDiff, null, 2)}
\`\`\`
</details>

## Documentation:

${docs}
  `;

  await getOctokit().issues.createComment({
    owner: getPullRequest().base.repo.owner.login,
    repo: getPullRequest().base.repo.name,
    issue_number: getPullRequest().number,
    body: comment,
  });
}

async function getDiff() {
  const prDiff = (
    await getOctokit().pulls.get({
      owner: getPullRequest().base.repo.owner.login,
      repo: getPullRequest().base.repo.name,
      pull_number: getPullRequest().number,
      mediaType: { format: 'diff' },
    })
  ).data;

  return diff.parse(prDiff);
}

function didFileChange(diff, path) {
  function makeRelative(str) {
    return str.replace(/^\w+\//, './');
  }

  return diff.find(
    (file) =>
      makeRelative(file.oldPath) === path || makeRelative(file.newPath) === path
  );
}

async function getSpecVersions(path) {
  const baseOptions = {
    path,
    mediaType: { format: 'raw' },
  };

  async function getVersion(version) {
    const pr = getPullRequest()[version];
    const content = (
      await getOctokit().repos.getContent({
        ...baseOptions,
        owner: pr.repo.owner.login,
        repo: pr.repo.name,
        ref: pr.ref,
      })
    ).data;

    const spec = yaml.safeLoad(content);

    return {
      content,
      location: `${version}/${path}`,
      format:
        'swagger' in spec ? 'swagger2' : 'openapi' in spec ? 'openapi3' : null,
    };
  }

  return {
    sourceSpec: await getVersion('base'),
    destinationSpec: await getVersion('head'),
  };
}

async function main() {
  if (!github.context.payload.pull_request) {
    return;
  }

  const diff = await getDiff();

  let specPaths = core.getInput('spec-paths', { required: true });
  if (typeof specPaths === 'string') {
    specPaths = [specPaths];
  }

  // console.log('specpaths', specPaths);
  await Promise.all(
    specPaths.map(async (specGlob) => {
      // console.log('expanding glob for ', specGlob);
      const paths = await promisify(glob)(specGlob);
      // console.log('paths', paths);
      return Promise.all(
        paths.map(async (path) => {
          console.log('checking ', path);
          if (didFileChange(diff, path)) {
            processSpec(path);
          }
        })
      );
    })
  );
}

main().catch((err) => core.setFailed(err.message));
