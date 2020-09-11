'use strict';

const { promises: fs } = require('fs');

const core = require('@actions/core');
const github = require('@actions/github');

const widdershins = require('widdershins');

const main = async () => {
  const specPath = core.getInput('spec-path');
  console.log(`Processing spec: ${specPath}`);

  const spec = await fs.readFile(specPath, 'utf-8');
  console.log('Spec:', spec);

  const docs = widdershins.convert(spec, {});
  console.log('Docs:', docs);
};

main().catch((err) => core.setFailed(err.message));
