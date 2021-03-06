import { kdebug } from './kdebug';
import { parseKernelSlot } from './parseKernelSlots';

// XXX temporary flags to control features during development
const ENABLE_PROMISE_ANALYSIS = true; // flag to enable/disable check to see if delete clist entry is ok

export function deleteCListEntryIfEasy(
  vatID,
  vatKeeper,
  kernelKeeper,
  kpid,
  vpid,
  kernelData,
) {
  if (ENABLE_PROMISE_ANALYSIS) {
    const visited = new Set();
    let sawPromise;

    function scanKernelPromise(scanKPID, scanKernelData) {
      visited.add(scanKPID);
      kdebug(`@@@ scan ${scanKPID}`);
      if (scanKernelData) {
        for (const slot of scanKernelData.slots) {
          const { type } = parseKernelSlot(slot);
          if (type === 'promise') {
            sawPromise = slot;
            if (visited.has(slot)) {
              kdebug(`@@@ ${slot} previously visited`);
              return true;
            } else {
              const { data, state } = kernelKeeper.getKernelPromise(slot);
              if (data) {
                if (scanKernelPromise(slot, data)) {
                  kdebug(`@@@ scan ${slot} detects circularity`);
                  return true;
                }
              } else {
                kdebug(`@@@ scan ${slot} state = ${state}`);
              }
            }
          }
        }
      }
      kdebug(`@@@ scan ${scanKPID} detects no circularity`);
      return false;
    }

    kdebug(`@@ checking ${vatID} ${kpid} for circularity`);
    if (scanKernelPromise(kpid, kernelData)) {
      kdebug(
        `Unable to delete ${vatID} clist entry ${kpid}<=>${vpid} because it is indirectly self-referential`,
      );
      return;
    } else if (sawPromise) {
      kdebug(
        `Unable to delete ${vatID} clist entry ${kpid}<=>${vpid} because there was a contained promise ${sawPromise}`,
      );
      return;
    }
  }
  vatKeeper.deleteCListEntry(kpid, vpid);
}
