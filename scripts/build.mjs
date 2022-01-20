import chalk from 'chalk';
import { build } from 'esbuild';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { esbuildDecorators } from '@anatine/esbuild-decorators';

async function buildPackage(path) {
  const entry = `${path}/src/index.ts`;
  const isEntryExists = existsSync(entry);

  let packageJSON;
  try {
    packageJSON = readFileSync(
      join(process.cwd(), 'package.json'),
      'utf-8',
    );
  } catch (e) {
    console.error(e);
    return;
  }

  if (!isEntryExists || !packageJSON) {
    throw new Error(`Entry file missing from index`);
  }

  const external = [
    ...Object.keys(JSON.parse(packageJSON)?.dependencies || {}),
  ];

  external.push('path');
  external.push('fs');
  external.push('https');
  external.push('http2');
  external.push('http');

  const output = `${path}/dist`;

  await build({
    entryPoints: [entry],
    outdir: `${output}`,
    format: 'cjs',
    target: 'es6',
    bundle: true,
    minify: false,
    external,
    plugins: [esbuildDecorators()],
  }).catch((e) => {
    throw new Error(`CJS Build failed for deploy \n ${e}`);
  });

  console.log(chalk.green(`deploy build complete`));
};

(async () => {
  await buildPackage(process.cwd());
})()
