'use strict';

const { promises: fs } = require('fs');

const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

const converter = require('widdershins');

const parsers = [
  {
    extensions: ['.json'],
    parse: (str) => JSON.parse(str),
  },
  {
    extensions: ['.yaml', '.yml'],
    parse: (str) => yaml.safeLoad(str),
  },
];

async function parseFile(specPath) {
  const data = await fs.readFile(specPath, 'utf-8');

  const ext = path.extname(specPath);
  const parser = parsers.find(({ extensions }) => extensions.includes(ext));
  if (!parser) {
    throw new Error(`Unkown file extension ${ext}`);
  }

  return parser.parse(data);
}

async function main() {
  const spec = await parseFile(core.getInput('spec-path'));

  let docs = await converter.convert(spec, {});

  // TODO: Use remark to modify the document in a more robust way
  docs = docs.substring(docs.indexOf('---', 3) + 3);
  docs = docs.replace(/> Scroll down for code samples.*/g, '');

  console.log('\n' + docs + '\n');

  const { pull_request: pullRequest } = github.context.payload;

  if (!pullRequest) {
    // TODO: Find the PR another way
    return;
  }

  github.getOctokit(core.getInput('github-token')).issues.createComment({
    ...github.context.repo,
    issue_number: pullRequest.number,
    body: docs,
  });
}

main().catch((err) => core.setFailed(err.message));
