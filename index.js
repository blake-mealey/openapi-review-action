const core = require('@actions/core');
const github = require('@actions/github');
const widdershins = require('widdershins');
const fs = require('fs');

try {
  const specPath = core.getInput('spec-path');

  console.log(`Processing spec: ${specPath}`);

  const spec = fs.readFileSync(specPath, { encoding: 'utf-8' });

  const docs = widdershins.convert(spec, {});

  console.log(docs);
} catch (error) {
  core.setFailed(error.message);
}
