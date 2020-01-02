import { makePathAccess } from 'fs';  // beware: powerful!

const byExt = {
  '.html': 'text/html',
  '.js': 'application/javascript',
};


// ISSUE: move to pathlib?
function resolveDown(path, there) {
  if (there.indexOf('..') >= 0) {
    throw new Error('no permission');
  }
  return path.resolve(there);
}

function makeServeStatic(files) {
  const index = files.resolve('index.html');

  return function staticHandler(req, res, next) {
    // console.log('express.static', req.method, req.path);

    if (req.method !== 'GET') { next(); return; }

    let file;
    if (req.path === '/' && index.exists()) {
      file = index;
      res.set('content-type', 'text/html');
    } else {
      try {
	file = resolveDown(files, req.path.slice(1));
      } catch(_noPermission) {
	next({ status: 403, message: `not authorized: ${req.path}` });
	return;
      }
      if (!file.exists()) {
	next({ status: 404, message: `not found: ${req.path}` });
	return;
      }
    }
    const body = file.readFileSync();
    for (const [ext, mt] of Object.entries(byExt)) {
      if (req.path.endsWith(ext)) {
	res.set('content-type', mt);
	break;
      }
    }
    res.send(body);
    next();
  };
}

export default function serveStatic(dirpath) {
  return makeServeStatic(makePathAccess(dirpath));
};
