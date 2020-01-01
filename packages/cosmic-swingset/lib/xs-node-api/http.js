import {Server} from 'xs-net/http';  // beware: powerful!

import harden from '@agoric/harden';


function makeEmitter() {
  const byName = {};

  const later = thunk => Promise.resolve(null).then(thunk);

  return harden({
    on(name, handler) {
      if (name in byName) {
	byName[name].push(handler);
      } else {
	byName[name] = [handler];
      }
    },
    emit(name, ...args) {
      const handlers = byName[name];
      if (!handlers) { return; }
      for (const handler of handlers) {
	later(() => handler(...args));
      }
    }
  });
}

export function createServer(handler) {
  let server;
  const events = makeEmitter();

  function listen(port, host, listening) {
    server = new Server({ host, port });
    server.callback = function(message, val1, val2) {
       // ISSUE: xs http API uses `this`
      if (!this.request) {
	this.request = {};
	this.buf = { content: '', pos: 0 };
      }
      const { request: req, buf, socket } = this;
      switch (message) {
      case 2:
	req.status = 200;
	req.path = val1;
	req.method = val2;
	req.headers = {};
	req.upgrade = false;
	break;
      case 3:
	req.headers[val1] = val2;
	break;
      case 4:
	console.log('@@http shim got request head:', req);
	if (req.headers['upgrade'] === 'websocket') {
	  const peer = socket.get('REMOTE_IP').split(':');
	  const [host, port] = peer;
	  // socket.state has to stay mutable, so we can't harden nodeSocket
	  // We don't rely on this structure after handling it
	  // to the event handler, though.
	  const nodeSocket = {
	    remoteAddress: host,
	    remotePort: port,
	    _xs_socket: socket,
	  };
	  const nodeReq = {
	    headers: req.headers,
	    url: req.path,
	    socket: nodeSocket,
	  };
	  const bodyHead = '';
	  events.emit('upgrade', nodeReq, nodeSocket, bodyHead);
	  req.upgrade = true;
	}
	break;
      case 8:
	if (req.upgrade) { return undefined; }  // don't reply
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
	console.log('@@http shim calling handler with:', req);
	handler(req, resp);
	const out = harden({
	  status: req.status,
	  headers: Object.entries(byName).flatMap(nv => nv),
	  body: true,
	});
	console.log('@@http shim responding:', out);
	return out;
      case 9:
	if (buf.pos >= buf.content.length) {
	  console.log('@@http shim: request done');
	  return undefined;
	}
	const okToTx = val1;
	const chunk = buf.content.slice(buf.pos, buf.pos + okToTx);
	buf.pos += okToTx;
	console.log('@@http shim chunk:', okToTx, chunk.slice(0, 16));
	return chunk;
      }
      return undefined;
    };
    listening();
  }

  return harden({
    on: events.on,
    listen,
  });
}

export default { createServer };
