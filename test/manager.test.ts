import { DOMWindow, JSDOM } from 'jsdom';
import { ComponentAction, Environment } from '@standardnotes/snjs';
import { sleep, performComponentAction } from './helpers';
import ComponentManager from './../lib/componentManager';

describe("ComponentManager", () => {
  const onReady = jest.fn();

  /** The parent window (Standard Notes App) */
  let parentWindow: DOMWindow;
  /** The child window. This is where the extension lives. */
  let childWindow: Window;
  let componentManager: ComponentManager;

  beforeEach(async () => {
    const parent = await JSDOM.fromURL('http://app.standardnotes.test/parent', {
      resources: "usable"
    });
    parentWindow = parent.window;

    const childIframe = parentWindow.document.createElement('iframe');
    childIframe.setAttribute("src", "http://app.standardnotes.test/extensions/demo");
    parentWindow.document.body.appendChild(childIframe);
    childWindow = childIframe.contentWindow;

    componentManager = new ComponentManager(childWindow, {
      onReady,
      options: {
        acceptsThemes: true
      }
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
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    expect(onReady).toBeCalledTimes(1);
  });

  test('getSelfComponentUUID() before the component is registered should be undefined', () => {
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).toBeUndefined();
  });

  test('getSelfComponentUUID() after the component is registered should not be undefined', async () => {
    const expectedMessage = await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).not.toBeUndefined();
    expect(uuid).toBe(expectedMessage.data.uuid);
  });

  test('getComponentDataValueForKey() before the component is registered should return undefined', async () => {
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBeUndefined();
  });

  test('getComponentDataValueForKey() with a key that does not exist should return undefined', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    const value = componentManager.getComponentDataValueForKey("bar");
    expect(value).toBeUndefined();
  });

  test('getComponentDataValueForKey() with an existing key should return value', async () => {
    const expectedMessage = await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBe(expectedMessage.componentData.foo);
  });

  test('setComponentDataValueForKey() should throw an error if component is not initialized', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    expect(() => componentManager.setComponentDataValueForKey("", ""))
      .toThrow('The component has not been initialized.');
    expect(parentPostMessage).not.toBeCalled();
  });

  test('setComponentDataValueForKey() with an invalid key should throw an error', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    expect(() => componentManager.setComponentDataValueForKey("", ""))
      .toThrow('The key for the data value should be a valid string.');
    expect(parentPostMessage).not.toBeCalled();
  });

  test('setComponentDataValueForKey() should set the value for the corresponding key', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    const expectedMessage = await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    const dataValue = `value-${Date.now()}`;
    componentManager.setComponentDataValueForKey("testing", dataValue);
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    const expectedComponentData = {
      componentData: {
        testing: dataValue,
        ...expectedMessage.componentData,
      }
    };
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.SetComponentData,
      data: expectedComponentData,
      messageId: "fake-uuid",
      sessionKey: expectedMessage.sessionKey,
      api: "component"
    }), expect.any(String));
    const value = componentManager.getComponentDataValueForKey("testing");
    expect(value).toEqual(dataValue);
  });

  test('clearComponentData() should clear all component data', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    const expectedMessage = await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    componentManager.clearComponentData();
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.SetComponentData,
      data: {
        componentData: {}
      },
      messageId: "fake-uuid",
      sessionKey: expectedMessage.sessionKey,
      api: "component"
    }), expect.any(String));
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBeUndefined();
  });

  test('isRunningInDesktopApplication() should return false if the environment is web', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      environment: Environment.Web
    });
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return false if the environment is mobile', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      environment: Environment.Mobile
    });
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return true if the environment is desktop', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      environment: Environment.Desktop
    });
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(true);
  });

  test('isRunningInMobileApplication() should return false if the environment is web', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      environment: Environment.Web
    });
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return false if the environment is desktop', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      environment: Environment.Desktop
    });
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return true if the environment is mobile', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      environment: Environment.Mobile
    });
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
    const expectedMessage = await performComponentAction(childWindow, ComponentAction.ComponentRegistered);
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.RequestPermissions,
      data: params.initialPermissions,
      messageId: "fake-uuid",
      sessionKey: expectedMessage.sessionKey,
      api: "component",
    }), expect.any(String));
  });

  test('postMessage payload should be stringified if on mobile', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    const expectedMessage = await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      environment: Environment.Mobile
    });
    componentManager.setComponentDataValueForKey("testing", "1234");
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    const expectedComponentData = {
      componentData: {
        ...expectedMessage.componentData,
        testing: "1234",
      }
    };
    const stringifiedData = JSON.stringify({
      action: ComponentAction.SetComponentData,
      data: expectedComponentData,
      messageId: "fake-uuid",
      sessionKey: expectedMessage.sessionKey,
      api: "component",
    });
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.stringContaining(stringifiedData),
      expect.any(String) // TODO: jsdom should report the proper URL and not an empty string
    );
  });

  it('should activate themes when ready, by inserting elements to <head>', async () => {
    /* Wait some time so that the iframe gets to load content. */
    await sleep(1);

    const themeUrls = [
      "http://app.standardnotes.test/themes/default"
    ];
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      themeUrls
    });
    const customThemes = childWindow.document.head.getElementsByClassName('custom-theme');
    expect(customThemes.length).toEqual(1);

    const themeLink = customThemes[0] as HTMLLinkElement;
    expect(themeLink.id).toEqual(btoa(themeUrls[0]));
    expect(themeLink.href).toEqual(new URL(themeUrls[0]).href);
    expect(themeLink.type).toEqual('text/css');
    expect(themeLink.rel).toEqual('stylesheet');
    expect(themeLink.media).toEqual('screen,print');
  });

  it('should disable current themes and activate new ones when sending the theme action', async () => {
    // Wait some time so that the iframe gets to load content.
    await sleep(1);

    const initialThemeUrls = [
      "http://app.standardnotes.test/themes/default"
    ];
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      themeUrls: initialThemeUrls
    });

    const newThemeUrls = [
      "http://app.standardnotes.test/themes/dark"
    ];
    await performComponentAction(childWindow, ComponentAction.ActivateThemes, {
      themeUrls: newThemeUrls
    });

    const customThemes = childWindow.document.head.getElementsByClassName('custom-theme');
    expect(customThemes.length).toEqual(1);

    const themeLink = customThemes[0] as HTMLLinkElement;
    expect(themeLink.id).toEqual(btoa(newThemeUrls[0]));
    expect(themeLink.href).toEqual(new URL(newThemeUrls[0]).href);
    expect(themeLink.type).toEqual('text/css');
    expect(themeLink.rel).toEqual('stylesheet');
    expect(themeLink.media).toEqual('screen,print');
  });

  it('should queue message if sessionKey is not set', async () => {
    await performComponentAction(childWindow, ComponentAction.ComponentRegistered, {
      sendSessionKey: false
    });
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    componentManager.setComponentDataValueForKey("testing", "1234");
    expect(parentPostMessage).not.toHaveBeenCalled();
  });
});
