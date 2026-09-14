/**
 * The smallest Chrome DevTools Protocol client that does the job.
 *
 * Node 22+ ships a WebSocket, so driving Chrome directly costs nothing and
 * avoids a Puppeteer install whose bundled browser would dwarf this repository.
 */
export const connect = async (port) => {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');

  if (!page) throw new Error('Chrome is running but exposes no page target');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error('could not open a CDP socket'));
  });

  let nextId = 0;
  const pending = new Map();

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const waiting = pending.get(message.id);

    if (!waiting) return;

    pending.delete(message.id);
    message.error
      ? waiting.reject(new Error(`${message.error.message ?? JSON.stringify(message.error)}`))
      : waiting.resolve(message.result);
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  /** Runs an async body in the page and returns its value. */
  const evaluate = async (body) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression: `(async () => { ${body} })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? 'page threw');
    }

    return result?.value;
  };

  return { send, evaluate, close: () => socket.close() };
};

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
