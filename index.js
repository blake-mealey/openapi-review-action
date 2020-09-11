'use strict';

const { promises: fs } = require('fs');

const core = require('@actions/core');
const github = require('@actions/github');

const widdershins = require('widdershins');

const main = async () => {
  const specPath = core.getInput('spec-path');

  const spec = await fs.readFile(specPath, 'utf-8');

  const docs = await widdershins.convert(spec, {});

  console.log('payload:', github.context.payload);

  const githubToken = core.getInput('github-token');
  console.log('token:', githubToken);
  //github.getOctokit(githubToken).pulls.createReviewComment({});
};

main().catch((err) => core.setFailed(err.message));
