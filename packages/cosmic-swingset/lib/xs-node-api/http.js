import {Server} from 'xs-net/http';  // beware: powerful!

import harden from '@agoric/harden';

export function createServer(handler) {
  let server;

  function listen(port, host, listening) {
    server = new Server({ host, port });
    server.callback = function(message, val1, val2) {
       // ISSUE: xs http API uses `this`
      if (!this.request) {
	this.request = {};
	this.buf = { content: '', pos: 0 };
      }
      const { request: req, buf } = this;
      switch (message) {
      case 2:
	req.status = 200;
	req.path = val1;
	req.method = val2;
	req.headers = {};
	break;
      case 3:
	req.headers[val1] = val2;
	break;
      case 8:
	harden(req);
	let byName = {'content-type': 'text/plain'};
	const resp = harden({
	  status(code) {
	    req.status = code;
	    return resp;
	  },
	  set(name, value) {
	    byName[name.toLowerCase()] = value;
	    return resp;
	  },
	  send(content) {
	    buf.content = content;
	    return resp;
	  },
	});
	handler(req, resp);
	return harden({
	  status: req.status,
	  headers: Object.entries(byName).flatMap(nv => nv),
	  body: true,
	});
      case 9:
	if (buf.pos >= buf.content.length) {
	  return undefined;
	}
	const okToTx = val1;
	const chunk = buf.content.slice(buf.pos, buf.pos + okToTx);
	buf.pos += okToTx;
	return chunk;
      }
      return undefined;
    };
    listening();
  }

  return harden({
    on(name, handler) {
      switch (name) {
      case 'upgrade':
	console.error('http upgrade TODO');
	break;
      default:
	throw new Error(`http.on(${name}) not implemented`);
      }
    },
    listen,
  });
}

export default { createServer };
