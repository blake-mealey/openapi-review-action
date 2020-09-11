'use strict';

const { promises: fs } = require('fs');

const core = require('@actions/core');
const github = require('@actions/github');

const widdershins = require('widdershins');

const main = async () => {
  const specPath = core.getInput('spec-path');

  const spec = await fs.readFile(specPath, 'utf-8');

  const docs = await widdershins.convert(spec, {});
  console.log('\n' + docs + '\n');

  console.log('context:', github.context);

  const { pull_request: pullRequest } = github.context.payload;

  if (!pullRequest) {
    // TODO: Find the PR another way
    return;
  }

  const githubToken = core.getInput('github-token');

  github.getOctokit(githubToken).issues.createComment({
    ...github.context.repo,
    issue_number: pullRequest.number,
    body: docs,
  });
};

main().catch((err) => core.setFailed(err.message));
