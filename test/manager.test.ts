import { DOMWindow, JSDOM } from 'jsdom';
import { Environment } from '@standardnotes/snjs';
import { htmlTemplate, postMessage } from './utils';
import { componentRegisteredMessage } from './componentMessages';
import ComponentManager from './../lib/componentManager';

describe("ComponentManager", () => {
  const onReady = jest.fn();

  /** The parent window (Standard Notes App) */
  let parentWindow: DOMWindow;
  /** The child window. This is where the extension lives. */
  let childWindow: Window;
  let componentManager: ComponentManager;

  const registeredComponentAction = async (environment?: Environment) => {
    const message = componentRegisteredMessage;
    if (environment) message.data.environment = environment;
    await postMessage(childWindow, componentRegisteredMessage, '*');
  };

  beforeEach(async () => {
    parentWindow = new JSDOM(htmlTemplate).window;

    const childIframe = parentWindow.document.createElement('iframe');
    parentWindow.document.body.appendChild(childIframe);
    childWindow = childIframe.contentWindow;

    componentManager = new ComponentManager(childWindow, {
      onReady
    });
  });

  afterEach(() => {
    const childIframe = parentWindow.document.getElementsByTagName('iframe')[0];
    parentWindow.document.body.removeChild(childIframe);
    parentWindow.close();
  });

  it('should not be undefined', () => {
    expect(componentManager).not.toBeUndefined();
  });

  it('should not run onReady callback when component has not been registered', () => {
    expect(onReady).toBeCalledTimes(0);
  });

  it('should run onReady callback when component is registered', async () => {
    await registeredComponentAction();
    expect(onReady).toBeCalledTimes(1);
  });

  test('getSelfComponentUUID() before the component is registered should be undefined', () => {
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).toBeUndefined();
  });

  test('getSelfComponentUUID() after the component is registered should not be undefined', async () => {
    await registeredComponentAction();
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).not.toBeUndefined();
    expect(uuid).toBe(componentRegisteredMessage.data.uuid);
  });

  test('getComponentDataValueForKey() with a key that does not exist should return undefined', async () => {
    await registeredComponentAction();
    const bar = componentManager.getComponentDataValueForKey("bar");
    expect(bar).toBeUndefined();
  });

  test('getComponentDataValueForKey() with an existing key should return value', async () => {
    await registeredComponentAction();
    const foo = componentManager.getComponentDataValueForKey("foo");
    expect(foo).toBe(componentRegisteredMessage.componentData.foo);
  });

  test('isRunningInDesktopApplication() should return false if the environment is web', async () => {
    await registeredComponentAction(Environment.Web);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return false if the environment is mobile', async () => {
    await registeredComponentAction(Environment.Mobile);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return true if the environment is desktop', async () => {
    await registeredComponentAction(Environment.Desktop);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(true);
  });
});
