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
    console.log('@@express.static', req.path);

    let file;
    if (req.path === '/' && index.exists()) {
      file = index;
      res.set('content-type', 'text/html');
    } else {
      try {
	file = resolveDown(files, req.path.slice(1));
      } catch(_noPermission) {
	res.status(403).send(`not authorized: ${req.path}`);
	return next();
      }
      if (!file.exists()) {
	res.status(404).send(`not found: ${req.path}`);
	return next();
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
    return next();
  };
}

export default function serveStatic(dirpath) {
  return makeServeStatic(makePathAccess(dirpath));
};
