import {
  ComponentAction,
  ContentType,
  Environment,
  PayloadContent,
  Platform,
  SNApplication,
  SNComponent,
  SNTheme
} from '@standardnotes/snjs';
import {
  sleep,
  getRawTestComponentItem,
  testExtensionPackage,
  testThemeDefaultPackage,
  testThemeDarkPackage
} from './helpers';
import ComponentManager from './../lib/componentManager';
import { createApplication } from './lib/appFactory';
import { DOMWindow, JSDOM } from 'jsdom';

const rawTestComponentItem = getRawTestComponentItem(testExtensionPackage);

describe("ComponentManager", () => {
  const onReady = jest.fn();

  /** The parent window (Standard Notes App) */
  let parentWindow: DOMWindow;
  /** The child window. This is where the extension lives. */
  let childWindow: Window;
  let componentManager: ComponentManager;
  /** The Standard Notes application. */
  let testSNApp: SNApplication;
  /** The test component. */
  let testComponent: SNComponent;

  const registerComponent = async (
    application: SNApplication,
    targetWindow: Window,
    component: SNComponent
  ) => {
    application.componentManager.registerComponentWindow(
      component,
      targetWindow
    );

    /**
     * componentManager.registerComponentWindow() calls targetWindow.parent.postMesasge()
     * We need to make sure that the event is dispatched properly by waiting a few ms.
     * See https://github.com/jsdom/jsdom/issues/2245#issuecomment-392556153
     */
    await sleep(0.1);
  };

  beforeEach(async () => {
    parentWindow = await JSDOM.fromURL('http://app.standardnotes.test/parent', {
      resources: "usable"
    }).then((result) => result.window);
    // @ts-ignore
    global.window = parentWindow;
    const childIframe = parentWindow.document.createElement('iframe');
    childIframe.setAttribute("src", "http://app.standardnotes.test/extensions/my-test-extension");
    parentWindow.document.body.appendChild(childIframe);
    childWindow = childIframe.contentWindow;
    testSNApp = createApplication('test-application', Environment.Web, Platform.LinuxWeb);
    testComponent = await testSNApp.createManagedItem(
      rawTestComponentItem.content_type as ContentType,
      rawTestComponentItem.content,
      false
    ) as SNComponent;
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
    componentManager = undefined;
    testComponent = undefined;
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
    await registerComponent(testSNApp, childWindow, testComponent);
    expect(onReady).toBeCalledTimes(1);
  });

  test('getSelfComponentUUID() before the component is registered should be undefined', () => {
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).toBeUndefined();
  });

  test('getSelfComponentUUID() after the component is registered should not be undefined', async () => {
    await registerComponent(testSNApp, childWindow, testComponent);
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).not.toBeUndefined();
    expect(uuid).toBe(testComponent.uuid);
  });

  test('getComponentDataValueForKey() before the component is registered should return undefined', async () => {
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBeUndefined();
  });

  test('getComponentDataValueForKey() with a key that does not exist should return undefined', async () => {
    await registerComponent(testSNApp, childWindow, testComponent);
    const value = componentManager.getComponentDataValueForKey("bar");
    expect(value).toBeUndefined();
  });

  test('getComponentDataValueForKey() with an existing key should return value', async () => {
    await registerComponent(testSNApp, childWindow, testComponent);
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBe("bar");
  });

  test('setComponentDataValueForKey() should throw an error if component is not initialized', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    expect(() => componentManager.setComponentDataValueForKey("", ""))
      .toThrow('The component has not been initialized.');
    expect(parentPostMessage).not.toBeCalled();
  });

  test('setComponentDataValueForKey() with an invalid key should throw an error', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registerComponent(testSNApp, childWindow, testComponent);
    expect(() => componentManager.setComponentDataValueForKey("", ""))
      .toThrow('The key for the data value should be a valid string.');
    expect(parentPostMessage).not.toBeCalled();
  });

  test('setComponentDataValueForKey() should set the value for the corresponding key', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registerComponent(testSNApp, childWindow, testComponent);
    const dataValue = `value-${Date.now()}`;
    componentManager.setComponentDataValueForKey("testing", dataValue);
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    const expectedComponentData = {
      componentData: {
        ...testComponent.componentData,
        testing: dataValue,
      }
    };
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.SetComponentData,
      data: expectedComponentData,
      messageId: "fake-uuid",
      sessionKey: "fake-uuid",
      api: "component"
    }), expect.any(String));
    const value = componentManager.getComponentDataValueForKey("testing");
    expect(value).toEqual(dataValue);
  });

  test('clearComponentData() should clear all component data', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registerComponent(testSNApp, childWindow, testComponent);
    componentManager.clearComponentData();
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.SetComponentData,
      data: {
        componentData: {}
      },
      messageId: "fake-uuid",
      sessionKey: "fake-uuid",
      api: "component"
    }), expect.any(String));
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBeUndefined();
  });

  test('isRunningInDesktopApplication() should return false if the environment is web', async () => {
    testSNApp = createApplication('test-application', Environment.Web, Platform.LinuxWeb);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return false if the environment is mobile', async () => {
    testSNApp = createApplication('test-application', Environment.Mobile, Platform.Android);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return true if the environment is desktop', async () => {
    testSNApp = createApplication('test-application', Environment.Desktop, Platform.LinuxDesktop);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(true);
  });

  test('isRunningInMobileApplication() should return false if the environment is web', async () => {
    testSNApp = createApplication('test-application', Environment.Web, Platform.LinuxWeb);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return false if the environment is desktop', async () => {
    testSNApp = createApplication('test-application', Environment.Desktop, Platform.LinuxDesktop);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return true if the environment is mobile', async () => {
    testSNApp = createApplication('test-application', Environment.Mobile, Platform.Android);
    await registerComponent(testSNApp, childWindow, testComponent);
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
    await registerComponent(testSNApp, childWindow, testComponent);
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.RequestPermissions,
      data: params.initialPermissions,
      messageId: "fake-uuid",
      sessionKey: "fake-uuid",
      api: "component",
    }), expect.any(String));
  });

  test('postMessage payload should be stringified if on mobile', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    testSNApp = createApplication('test-application', Environment.Mobile, Platform.Android);
    await registerComponent(testSNApp, childWindow, testComponent);
    componentManager.setComponentDataValueForKey("testing", "1234");
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    const expectedComponentData = {
      componentData: {
        ...rawTestComponentItem.content.componentData,
        testing: "1234"
      }
    };
    const stringifiedData = JSON.stringify({
      action: ComponentAction.SetComponentData,
      data: expectedComponentData,
      messageId: "fake-uuid",
      sessionKey: "fake-uuid",
      api: "component",
    });
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.stringContaining(stringifiedData),
      expect.any(String) // TODO: jsdom should report the proper URL and not an empty string
    );
  });

  it('should activate themes when ready, by inserting elements to <head>', async () => {
    /* Wait some time so that the iframe gets to load content. */
    await sleep(0.01);

    const rawTestThemeDefaultItem = getRawTestComponentItem(testThemeDefaultPackage);
    const testTheme = await testSNApp.createManagedItem(
      rawTestThemeDefaultItem.content_type as ContentType,
      {
        active: true,
        ...rawTestThemeDefaultItem.content
      },
      false
    ) as SNTheme;
    await registerComponent(testSNApp, childWindow, testComponent);

    const customThemes = childWindow.document.head.getElementsByClassName('custom-theme');
    expect(customThemes.length).toEqual(1);

    const themeLink = customThemes[0] as HTMLLinkElement;
    expect(themeLink.id).toEqual(btoa(testTheme.hosted_url));
    expect(themeLink.href).toEqual(new URL(testTheme.hosted_url).href);
    expect(themeLink.type).toEqual('text/css');
    expect(themeLink.rel).toEqual('stylesheet');
    expect(themeLink.media).toEqual('screen,print');
  });

  test('postActiveThemesToComponent() should deactivate current theme and activate the new one', async () => {
    // Wait some time so that the iframe gets to load content.
    await sleep(0.01);

    /**
     * Creating an active SNTheme, that will be activated once the component is registered.
     */
    const rawTestThemeDefaultItem = getRawTestComponentItem(testThemeDefaultPackage);
    await testSNApp.createManagedItem(
      rawTestThemeDefaultItem.content_type as ContentType,
      {
        active: true,
        ...rawTestThemeDefaultItem.content
      },
      false
    ) as SNTheme;
    await registerComponent(testSNApp, childWindow, testComponent);

    /**
     * Creating another active SNTheme.
     * This will be used to replace the previously activated theme.
     */
    const rawTestThemeDarkItem = getRawTestComponentItem(testThemeDarkPackage);
    const testThemeDark = await testSNApp.createManagedItem(
      rawTestThemeDarkItem.content_type as ContentType,
      {
        active: true,
        ...rawTestThemeDarkItem.content
      },
      false
    ) as SNTheme;

    /**
     * componentManager.postActiveThemesToComponent() will trigger the ActivateTheme action.
     * This should deactivate our current active theme, and activate our new theme.
     */
    testSNApp.componentManager.postActiveThemesToComponent(testComponent);
    await sleep(0.001);

    const customThemes = childWindow.document.head.getElementsByClassName('custom-theme');
    expect(customThemes.length).toEqual(1);

    const themeLink = customThemes[0] as HTMLLinkElement;
    expect(themeLink.id).toEqual(btoa(testThemeDark.hosted_url));
    expect(themeLink.href).toEqual(new URL(testThemeDark.hosted_url).href);
    expect(themeLink.type).toEqual('text/css');
    expect(themeLink.rel).toEqual('stylesheet');
    expect(themeLink.media).toEqual('screen,print');
  });

  it('should queue message if sessionKey is not set', async () => {
    /**
     * Messages are queued when the sessionKey is not set or has a falsey value.
     * sessionKey is set by Uuid.GenerateUuid() which uses our generateUuid
     * function in our Utils module. We will mock the return value to be undefined.
     */
    const Utils = require('./../lib/utils');
    const originalGenerateUuid = Utils.generateUuid;
    Utils.generateUuid = jest.fn().mockReturnValue(undefined);

    await registerComponent(testSNApp, childWindow, testComponent);
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    componentManager.setComponentDataValueForKey("testing", "1234");
    expect(parentPostMessage).not.toHaveBeenCalled();

    // Restoring the mocked function.
    Utils.generateUuid = originalGenerateUuid;
  });
});
