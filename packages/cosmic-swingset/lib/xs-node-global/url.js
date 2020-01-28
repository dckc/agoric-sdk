// lib/ag-solo/web.js depends on URL global
// https://nodejs.org/api/globals.html#globals_url

const harden = x => Object.freeze(x, true);

function URL(addr) {
  const m = addr.match(/^(?<protocol>[^:]+:)\/\/(?<hostname>[^/:]*)/);
  const { protocol, hostname } = m.groups;
  return { protocol, hostname };
}

// monkey-testing with node
if (typeof module !== 'undefined') {
  console.log(URL('https://www.w3.org/xyz'));
  console.log(URL('http://localhost'));
}

globalThis.URL = harden(URL);
