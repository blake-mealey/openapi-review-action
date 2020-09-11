const core = require('@actions/core');
const github = require('@actions/github');
const widdershins = require('widdershins');
const { promises: fs } = require('fs');

const main = async () => {
  const specPath = core.getInput('spec-path');

  console.log(`Processing spec: ${specPath}`);

  const spec = await fs.readFile(specPath, 'utf-8');

  const docs = widdershins.convert(spec, {});

  console.log(docs);
};

main().catch((err) => core.setFailed(err.message));
