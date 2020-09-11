'use strict';

const { promises: fs } = require('fs');

const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');
const glob = require('glob');
const axios = require('axios');
const diff = require('what-the-diff');
const openapiDiff = require('openapi-diff');

const converter = require('widdershins');
const { promisify } = require('util');

function getPullRequest() {
  return github.context.payload.pull_request;
}

function getToken() {
  return core.getInput('github-token');
}

function getConverterOptions() {
  return core.getInput('converter-options') || {};
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
  docs = `> From spec: ${specPath}` + docs;

  // console.log('\n' + docs + '\n');

  await github.getOctokit(getToken()).issues.createComment({
    ...github.context.repo,
    issue_number: getPullRequest().number,
    body: docs,
  });
}

async function getDiff() {
  const pullRequest = getPullRequest();
  const prDiff = (
    await axios.get(`${pullRequest.diff_url}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
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

async function main() {
  if (!getPullRequest()) {
    return;
  }

  console.log(github.context);

  const diff = await getDiff();

  let specPaths = core.getInput('spec-paths');
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
