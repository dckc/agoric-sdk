import { Server } from 'moddable-sdk/network/http/http'; // beware: powerful!

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
      if (!handlers) {
        return;
      }
      for (const handler of handlers) {
        later(() => handler(...args));
      }
    },
  });
}

export function createServer(handler) {
  let server;
  const events = makeEmitter();

  function forNode(socket) {
    const peer = socket.get('REMOTE_IP').split(':');
    const [host, port] = peer;
    // socket.state has to stay mutable, so we can't harden this.
    // We don't rely on this structure after handling it
    // to the event handler, though.
    return {
      remoteAddress: host,
      remotePort: port,
      _xs_socket: socket,
    };
  }

  function checkUpgrade(req) {
    let upgrade = false;
    const tokens = txt => txt.split(',').map(tok => tok.trim().toLowerCase());

    // console.log('http shim got request head:', JSON.stringify(req, null, 2));

    if (
      'upgrade' in req.headers &&
      'connection' in req.headers &&
      tokens(req.headers.connection).includes('upgrade')
    ) {
      upgrade = true;
      const nodeReq = {
        headers: req.headers,
        url: req.path,
        socket: req.socket,
      };
      const bodyHead = ''; // ISSUE: data pending in socket?
      // console.log('emit upgrade');
      events.emit('upgrade', nodeReq, req.socket, bodyHead);
    }
    return upgrade;
  }

  function listen(port, host, listening) {
    server = new Server({ host, port });

    server.callback = function(message, val1, val2) {
      // ISSUE: xs http API uses `this` for Request
      if (!this._req) {
        this._req = { headers: {}, upgrade: false, body: null };
        this.buf = { content: '', pos: 0 };
      }
      const { _req: req, buf, socket } = this;
      switch (message) {
        case Server.status:
          req.path = val1;
          req.method = val2;
          break;

        case Server.header:
          req.headers[val1] = val2;
          break;

        case Server.headersComplete:
          req.socket = forNode(socket);
          if ((req.upgrade = checkUpgrade(req))) {
            socket.callback = () => {}; // stop normal HTTP Request handling
            return 'upgrade';
          }
          // process request body?
          return req.method === 'POST' ? String : false;

        case Server.requestComplete:
          req.body = val1;
          break;

        case Server.prepareResponse:
          if (req.upgrade) {
            throw new Error('BUG: upgrade requests reached prepareResponse');
          }

          let status = 200;
          const byName = { 'content-type': 'text/plain' };

	const responseP = new Promise((resolve, reject) => {
	  // ISSUE: reject all errors

	  function send(content) {
            buf.content += content;

            // { h1: v1, h2: v2 } => [h1, v1, h2, v2]
            const flatten = byName => Object.entries(byName).flatMap(nv => nv);
            const response = harden({
              status,
              headers: flatten(byName),
              body: true, // chunked
            });
            // console.log('http shim prepared response:', response);
            resolve(response);
	  }

          const resp = harden({
            status(code) {
              status = code;
              return resp;
            },
            get statusCode() {
              return status;
            },
            set(name, value) {
              byName[name.toLowerCase()] = value;
              return resp;
            },
            send,
            json(data) {
              byName['content-type'] = 'application/json';
              send(JSON.stringify(data));
            },
          });

          // ISSUE: harden(req);?
          // console.log('http shim: calling handler with:', req);
          handler(req, resp);
	});
	return responseP;

        case Server.responseFragment:
          if (buf.pos >= buf.content.length) {
            // console.log('http shim: response done');
            return undefined;
          }
          const okToTx = val1;
          const chunk = buf.content.slice(buf.pos, buf.pos + okToTx);
          buf.pos += okToTx;
          // console.log('http shim: response chunk:', okToTx, JSON.stringify(chunk.slice(0, 16)));
          return chunk;

        // TODO: case Server.error:
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
