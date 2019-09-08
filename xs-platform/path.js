export function isAbsolute(path) {
  return path.startsWith('/');
}

export function resolve(base, path) {
  if (path.startsWith('/')) {
    return path;
  }
  if (path.startsWith('.')) {
    throw new Error(`not implemented: resolve(_, ${path})`);
  }
  const sep = base.endsWith('/') ? '' : '/';
  return base + sep + path;
}

export default { isAbsolute, resolve };
