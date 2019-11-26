import bundleSource from '@agoric/bundle-source';

async function main(argv, { open, rollup, resolvePlugin, pathResolve }) {
  if (argv.length < 4) {
    throw new Error('usage: bundle startFilename dest');
  }
  const [startFilename, dest] = argv.slice(2, 4);

  const { source, sourceMap } = await bundleSource(
    startFilename,
    'getExport',
    { rollup, resolvePlugin, pathResolve },
  );
  const actualSource = `export default ${source}\n${sourceMap}`;
  const f = await open(dest, 'w', 0o644);
  await f.write(actualSource);
  await f.close();
}



/** Access ambient authority only if invoked as script. */
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  main(process.argv, {
    open: require('fs').promises.open,
    rollup: require('rollup').rollup,
    pathResolve: require('path').resolve,
    resolvePlugin: require('rollup-plugin-node-resolve'),
  }).then(
    _ => process.exit(0),
    err => {
      console.log('error creating bundle:');
      console.log(err);
      process.exit(1);
    },
  );
}

