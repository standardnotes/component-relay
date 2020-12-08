import { DOMWindow, JSDOM } from 'jsdom';
import { ComponentAction, Environment } from '@standardnotes/snjs';
import { htmlTemplate, postMessage } from './utils';
import { componentRegisteredMessage } from './componentMessages';
import ComponentManager from './../lib/componentManager';
import { URL } from 'url';

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

  const parentUrl = 'http://localhost/parent';
  const childUrl = 'http://localhost/child';

  beforeEach(async () => {
    parentWindow = new JSDOM(htmlTemplate, {
      url: parentUrl
    }).window;

    const childIframe = parentWindow.document.createElement('iframe');
    childIframe.setAttribute("src", childUrl);
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

  it('should throw error if contentWindow is undefined', () => {
    expect(() => new ComponentManager(undefined)).toThrow('contentWindow must be a valid Window object.');
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

  test('getComponentDataValueForKey() before the component is registered should return undefined', async () => {
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBeUndefined();
  });

  test('getComponentDataValueForKey() with a key that does not exist should return undefined', async () => {
    await registeredComponentAction();
    const value = componentManager.getComponentDataValueForKey("bar");
    expect(value).toBeUndefined();
  });

  test('getComponentDataValueForKey() with an existing key should return value', async () => {
    await registeredComponentAction();
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBe(componentRegisteredMessage.componentData.foo);
  });

  test('setComponentDataValueForKey() with an invalid key should throw an error', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registeredComponentAction(Environment.Web);
    expect(() => componentManager.setComponentDataValueForKey("", ""))
      .toThrow('The key for the data value should be a valid string.');
    expect(parentPostMessage).not.toBeCalled();
  });

  test('setComponentDataValueForKey() should set the value for the corresponding key', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registeredComponentAction(Environment.Web);
    const dataValue = `value-${Date.now()}`;
    componentManager.setComponentDataValueForKey("testing", dataValue);
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    const expectedComponentData = {
      componentData: {
        testing: dataValue,
        ...componentRegisteredMessage.componentData,
      }
    };
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.SetComponentData,
      data: expectedComponentData,
      messageId: "fake-uuid",
      sessionKey: componentRegisteredMessage.sessionKey,
      api: "component"
    }), expect.any(String));
    const value = componentManager.getComponentDataValueForKey("testing");
    expect(value).toEqual(dataValue);
  });

  test('clearComponentData() should clear all component data', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registeredComponentAction(Environment.Web);
    componentManager.clearComponentData();
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.SetComponentData,
      data: {
        componentData: {}
      },
      messageId: "fake-uuid",
      sessionKey: componentRegisteredMessage.sessionKey,
      api: "component"
    }), expect.any(String));
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBeUndefined();
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

  test('isRunningInMobileApplication() should return false if the environment is web', async () => {
    await registeredComponentAction(Environment.Web);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return false if the environment is desktop', async () => {
    await registeredComponentAction(Environment.Desktop);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return true if the environment is mobile', async () => {
    await registeredComponentAction(Environment.Mobile);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(true);
  });

  it('should request permissions when ready', async () => {
    const params = {
      initialPermissions: [
        { name: ComponentAction.StreamItems }
      ]
    };
    componentManager = new ComponentManager(childWindow, params);
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registeredComponentAction(Environment.Web);
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.RequestPermissions,
      data: params.initialPermissions,
      messageId: "fake-uuid",
      sessionKey: componentRegisteredMessage.sessionKey,
      api: "component"
    }), expect.any(String));
  });

  test('postMessage payload should be stringified if on mobile', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registeredComponentAction(Environment.Mobile);
    componentManager.setComponentDataValueForKey("testing", "1234");
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    const expectedComponentData = {
      componentData: {
        ...componentRegisteredMessage.componentData,
        testing: "1234",
      }
    };
    const stringifiedData = JSON.stringify({
      action: ComponentAction.SetComponentData,
      data: expectedComponentData,
      messageId: "fake-uuid",
      sessionKey: componentRegisteredMessage.sessionKey,
      api: "component",
    });
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.stringContaining(stringifiedData),
      expect.any(String) // TODO: jsdom should report the proper URL and not an empty string
    );
  });
});
