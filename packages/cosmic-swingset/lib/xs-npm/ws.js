import harden from '@agoric/harden';

import xsws from "xs-net/websocket";


const later = thunk => Promise.resolve(null).then(thunk);

// ISSUE: factor out overlap with http.js?
function makeEmitter() {
  const byName = {};

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

function WebSocket({ path, host, headers, protocol, socket }) {
  const events = makeEmitter();
  const xclient = new xsws.Client({ path, host, headers, protocol, socket });

  function emit(name, ...args) {
    events.emit(name, ...args);
  }

  xclient.callback = function(message, value) {
    switch (message) {
    case xsws.Client.connect:
      emit('connection');
      break;
    case xsws.Client.receive:
      emit('message', value);
      break;
    case xsws.Client.disconnect:
      emit('close');
    }
  };

  const OPEN = 1;
  return harden({
    connection: socket,
    readyState: OPEN,
    OPEN,
    emit,
    on(name, ...args) {
      events.on(name, ...args);
    },
    send(message) {
      xclient.write(message);
    },
  });
}

export function Server({ noServer }) {
  if (!noServer) { throw new Error('not supported: noServer: false'); }

  const events = makeEmitter();
  function on(name, handler) {
    if (!['upgrade', 'connection'].includes(name)) {
      throw new Error(`not supported: on(${name})`);
    }
    events.on(name, handler);
  }

  on('connection', (ws, req) => {
    // keep track of ws for closing?
  });

  return harden({
    on,
    handleUpgrade(nodeReq, nodeSocket, head, wsHandler) {
      // TODO: only handle given path?
      const { path, host, headers } = nodeReq;
      const { _xs_socket: socket } = nodeSocket;
      const protocol = 'TODO';
      console.log('@@shim TODO!!! actually handle upgrade');
      console.log('@@ws shim handleUpgrade making WebSocket:', { path, host, headers, protocol, socket });
      const ws = WebSocket({ path, host, headers, protocol, socket });
      later(() => wsHandler(ws));
    },
    emit: events.emit,
  });
}

export default { Server };
