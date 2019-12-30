import harden from '@agoric/harden';

export function Server() {
  return harden({
    on(name, handler) {
      console.error('ws.Server.on TODO');
    },
  });
}

export default { Server };
