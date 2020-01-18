import harden from '@agoric/harden';

import xsws from 'moddable-sdk/network/websocket/websocket';
import Base64 from 'moddable-sdk/data/base64/base64';
import { Digest } from 'moddable-sdk/crypt/digest/crypt';

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
      if (!handlers) {
        return;
      }
      for (const handler of handlers) {
        later(() => handler(...args));
      }
    },
  });
}

const readyStates = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

function WebSocket({ path, host, headers, protocol, socket }) {
  const events = makeEmitter();
  const xclient = new xsws.Client({ path, host, headers, protocol, socket });

  const { emit } = events;
  const OPEN = 1;
  let readyState = readyStates.CONNECTING;

  xclient.callback = function(message, value) {
    switch (message) {
      case xsws.Client.connect:
        readyState = readyStates.OPEN;
        emit('connection');
        break;
      case xsws.Client.receive:
        emit('message', value);
        break;
    case xsws.Client.disconnect:
        readyState = readyStates.CLOSED;
        emit('close');
    }
  };

  // ISSUE: cannot harden socket
  return {
    connection: socket,
    get readyState() {
      return readyState;
    },
    emit,
    on: events.on,
    send(message) {
      xclient.write(message);
    },
    ...readyStates,
  };
}

function handshakeResponse(key, protocol) {
  const sha1 = new Digest('SHA1');
  sha1.write(key);
  sha1.write('258EAFA5-E914-47DA-95CA-C5AB0DC85B11');

  const response = [
    'HTTP/1.1 101 Web Socket Protocol Handshake\r\n',
    'Connection: Upgrade\r\n',
    'Upgrade: websocket\r\n',
    'Sec-WebSocket-Accept: ',
    Base64.encode(sha1.close()),
    '\r\n',
  ];

  if (protocol) {
    response.push('Sec-WebSocket-Protocol: ', protocol, '\r\n');
  }
  response.push('\r\n');
  return response;
}

export function Server({ noServer }) {
  if (!noServer) {
    throw new Error('not supported: noServer: false');
  }

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
      // console.log('handleUpgrade', nodeReq, nodeSocket, head, wsHandler);
      const { path, host, headers } = nodeReq;

      const key = headers['sec-websocket-key'];
      if (headers['sec-websocket-version'] !== '13' || !key) {
        // not a valid websocket handshake
        // ISSUE: report error somewhere?
        return;
      }
      const protocol = undefined; // ISSUE: TODO? needed?
      const response = handshakeResponse(key, protocol);

      const { _xs_socket: socket } = nodeSocket;
      socket.write.apply(socket, response);
      const toRead = socket.read();
      if (toRead !== 0) {
        console.warn(
          'unexpected to receive a websocket message before server receives handshake',
          toRead,
        );
        throw new Error('not implemented: message with handshake');
      }

      // console.log('ws shim handleUpgrade making WebSocket:', { path, host, headers, protocol, socket });
      const ws = WebSocket({ path, host, headers, protocol, socket });
      later(() => wsHandler(ws));
    },
    emit: events.emit,
  });
}

export default { Server };
