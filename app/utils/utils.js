export function getTimestamp() {
  return (new Date()).getTime();
}

function beforeUnloadHelper() {
  let handlers = [];

  window.addEventListener("beforeunload", () => {
    for (let h of handlers) {
      h();
    }
  });

  return {
    add(handler) {
      handlers.push(handler);
    }
  }
}

export const beforeUnload = beforeUnloadHelper();

export function noop() {}
