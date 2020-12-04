import { DOMWindow } from "jsdom";

export const htmlTemplate = `<!doctype html>
  <html>
    <head></head>
    <body>
      <div id="root"></div>
    </body>
  </html>`;

export const postMessage = async (targetWindow: DOMWindow | Window, message: Object, targetOrigin: string) => {
  targetWindow.postMessage(message, targetOrigin);

  /**
   * window.postMesasge() implementation is wrapped with setTimeout.
   * See https://github.com/jsdom/jsdom/issues/2245#issuecomment-392556153
   */
  await new Promise(resolve => setTimeout(resolve, 100));
};
