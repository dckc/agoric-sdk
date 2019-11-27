import bundleSource from '@agoric/bundle-source';

async function main(argv, pkg, { open, rollup, resolvePlugin, pathResolve }) {
  if (argv.length < 4) {
    for (const dev of ['mailbox', 'command', 'timer']) {
      const [startFilename, dest] = [`${pkg}/src/devices/${dev}-src.js`, `${pkg}/src/bundles/${dev}-src.js`];
      await bundle1(startFilename, dest);
    }
  } else {
    const [startFilename, dest] = argv.slice(2, 4);
    await bundle1(startFilename, dest);
  }

  async function bundle1(startFilename, dest) {
    console.log(`bundle: ${startFilename} -> ${dest}`);
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

}


/** Access ambient authority only if invoked as script. */
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  main(process.argv, `${__dirname}/..`, {
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

