// ui-callbacks.js
// Decouples data/logic modules from the DOM layer.
// Modules call these functions instead of dynamically importing main.js.
// main.js calls registerUICallbacks() on init to wire up the real implementations.

const noop = () => {};

let _callbacks = {
  setCloudStatus: noop,
  updateMastheadProfile: noop,
  updateStorageStatus: noop,
  showToast: noop,
};

export function registerUICallbacks(callbacks) {
  _callbacks = { ..._callbacks, ...callbacks };
}

export function setCloudStatus(state) {
  _callbacks.setCloudStatus(state);
}

export function updateMastheadProfile() {
  _callbacks.updateMastheadProfile();
}

export function updateStorageStatus() {
  _callbacks.updateStorageStatus();
}

export function showToast(message, opts) {
  _callbacks.showToast(message, opts);
}
