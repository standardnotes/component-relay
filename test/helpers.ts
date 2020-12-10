import { ComponentAction } from "@standardnotes/snjs";
import componentMessages from './componentMessages';
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
  await sleep(0.01);
};

export const sleep = async (seconds: number) => {
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

export const getComponentActionMessage = (action: ComponentAction) => {
  return componentMessages.find((message) => message.action === action);
}
