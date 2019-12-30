import harden from '@agoric/harden';

import serveStatic from './serve-static';

function express() {
  const routes = [];

  function tryRoutes(req, res) {
    for (const { method, path, callback } of routes) {
      if (req.method === method && req.path === path) {
	callback(req, res);
	break;
      }
    }
  }

  const middleware = [tryRoutes];

  function handler(req, res) {
    let ix = middleware.length;
    function next() {
      ix -= 1;
      if (ix < 1) { return; }
      const cb = middleware[ix];
      cb(req, res, next);
    }
    next();
  }

  handler.post = (path, callback) => {
    routes.push({ method: 'POST', path, callback });
  };

  handler.use = callback => {
    if (typeof callback !== 'function') {
      throw new TypeError(JSON.stringify({ actual: typeof callback, expected: 'function' }));
    }
    middleware.push(callback);
  };

  return harden(handler);
}

express.json = function() {
  return function jsonHandler(req, res, next) {
    console.error('express.json TODO');
    next();
  };
};

express.static = serveStatic;

export default harden(express);
