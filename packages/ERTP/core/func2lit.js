async function main(argv, { stdout, requireDynamic }) {
  const [sourceFileName, exportName] = argv.slice(2);
  // TODO: usage
  const ex = requireDynamic(sourceFileName);
  await stdout.write(JSON.stringify(ex[exportName], null, 2));
}

if (typeof require === 'function' && typeof module === 'object') {
  main(process.argv, {
    stdout: process.stdout,
    // eslint-disable-next-line
    requireDynamic: require('esm')(module),
  });
}
