// Lightweight pub/sub for state change propagation
// Eliminates the "forgot to call renderX()" class of bugs

const listeners = {};

export function on(event, fn) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
  return () => off(event, fn);
}

export function off(event, fn) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(f => f !== fn);
}

export function emit(event, data) {
  (listeners[event] || []).forEach(fn => {
    try { fn(data); } catch(e) { console.warn(`Event handler error [${event}]:`, e); }
  });
}
