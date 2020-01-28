import harden from '@agoric/harden';

// eslint-disable-next-line import/no-unresolved
import Resource from 'moddable-sdk/files/resource/Resource';

/**
 * In the original node.js approach, the bundles/kernel module exports
 * a function and controller coerces it to string to get its
 * source.
 *
 * Here we load the kernel source from "ROM" as a Resource and
 * convert from ESM syntax a la getExport from bundle-source.
 */
export default harden({
  toString() {
    const kernelROM = new Resource('agoric.kernel.js');
    const kernelModText = String.fromArrayBuffer(kernelROM.slice(0));
    const kernelExpr = kernelModText.slice('export default '.length);
    return kernelExpr;
  },
});
