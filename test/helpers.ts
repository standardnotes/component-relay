import { ComponentAction, Environment } from '@standardnotes/snjs';
import { DOMWindow } from "jsdom";
import componentMessages from './componentMessages';

export const htmlTemplate = `<!doctype html>
  <html>
    <head></head>
    <body>
      <div id="root"></div>
    </body>
  </html>`;

export const sleep = async (seconds: number) => {
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

export const postMessage = async (targetWindow: DOMWindow | Window, message: Object, targetOrigin: string) => {
  targetWindow.postMessage(message, targetOrigin);

  /**
   * window.postMesasge() implementation is wrapped with setTimeout.
   * See https://github.com/jsdom/jsdom/issues/2245#issuecomment-392556153
   */
  await sleep(0.01);
};

const getComponentActionMessage = (action: ComponentAction) => {
  const message = componentMessages.find((message) => message.action === action);
  return copyObject(message);
};

const copyObject = (object: any) => {
  const objectStr = JSON.stringify(object);
  return JSON.parse(objectStr);
};

const getThemesKeyForAction = (action: ComponentAction) => {
  switch (action) {
    case ComponentAction.ComponentRegistered:
      return "activeThemeUrls";
    case ComponentAction.ActivateThemes:
    default:
      return "themes";
  }
};

export const performComponentAction = async (
  targetWindow: DOMWindow | Window,
  action: ComponentAction,
  options?: { environment?: Environment, themeUrls?: string[], sendSessionKey?: boolean }
) => {
  const message = getComponentActionMessage(action);
  if (options) {
    const { environment, themeUrls, sendSessionKey } = options;
    if (environment) message.data.environment = environment;
    if (sendSessionKey !== undefined) message.sessionKey = undefined;
    if (themeUrls) {
      const themeKey = getThemesKeyForAction(action);
      message.data[themeKey] = themeUrls;
    }
  }
  return postMessage(targetWindow, message, '*').then(() => message);
};
