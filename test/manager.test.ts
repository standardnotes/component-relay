import {
  ComponentAction,
  ComponentArea,
  ContentType,
  DeinitSource,
  Environment,
  Platform,
  SNApplication,
  SNComponent,
  SNItem,
  SNNote,
  SNTag,
  SNTheme
} from '@standardnotes/snjs';
import {
  sleep,
  getRawTestComponentItem,
  testExtensionEditorPackage,
  testExtensionForTagsPackage,
  testThemeDefaultPackage,
  testThemeDarkPackage,
  getTestNoteItem,
  htmlTemplate
} from './helpers';
import ComponentManager from './../lib/componentManager';
import { createApplication } from './lib/appFactory';

/**
 * A short amount of time to wait for messages to propagate via the postMessage API.
 */
const SHORT_DELAY_TIME = 0.01;

describe("ComponentManager", () => {
  const onReady = jest.fn();

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
    await sleep(SHORT_DELAY_TIME);
  };

  const createNoteItem = async (
    application: SNApplication,
    overrides = {}
  ) => {
    const testNoteItem = getTestNoteItem(overrides);
    return await application.createManagedItem(
      testNoteItem.content_type as ContentType,
      testNoteItem,
      false
    ) as SNNote;
  };

  const createTagItem = async (
    application: SNApplication,
    title: string
  ) => {
    return await application.createManagedItem(
      ContentType.Tag,
      {
        title,
        references: []
      },
      false
    ) as SNTag;
  };

  const createComponentItem = async (
    application: SNApplication,
    componentPackage: any,
    overrides = {}
  ) => {
    const rawTestComponentItem = getRawTestComponentItem(componentPackage);
    return await application.createManagedItem(
      rawTestComponentItem.content_type as ContentType,
      {
        ...overrides,
        ...rawTestComponentItem.content
      },
      false
    ) as SNComponent;
  };

  const registerComponentHandler = (
    application: SNApplication,
    areas: ComponentArea[],
    itemInContext?: SNItem,
    customActionHandler?: (data: any) => {},
  ) => {
    application.componentManager.registerHandler({
      identifier: 'generic-view-' + Math.random(),
      areas,
      actionHandler: (currentComponent, action, data) => {
        customActionHandler && customActionHandler(data);
      },
      contextRequestHandler: () => itemInContext
    });
  };

  beforeEach(async () => {
    const childIframe = window.document.createElement('iframe');
    window.document.body.appendChild(childIframe);
    window.document.querySelector('iframe').srcdoc = htmlTemplate;
    childWindow = childIframe.contentWindow;

    testSNApp = await createApplication('test-application', Environment.Web, Platform.LinuxWeb);
    testComponent = await createComponentItem(testSNApp, testExtensionEditorPackage);

    componentManager = new ComponentManager(childWindow, {
      onReady,
      options: {
        acceptsThemes: true
      }
    });
  });

  afterEach(() => {
    componentManager.deinit();
    componentManager = undefined;

    const childIframe = window.document.getElementsByTagName('iframe')[0];
    window.document.body.removeChild(childIframe);
    childWindow = undefined;

    testComponent = undefined;

    testSNApp.deinit(DeinitSource.SignOut);
    testSNApp = undefined;
  });

  it('should throw error if contentWindow is undefined', () => {
    expect(() => new ComponentManager(undefined)).toThrow('contentWindow must be a valid Window object.');
  });

  it('should not be undefined', () => {
    expect(componentManager).not.toBeUndefined();
  });

  it('should not run onReady callback when component has not been registered', () => {
    expect.hasAssertions();
    expect(onReady).toBeCalledTimes(0);
  });

  it('should run onReady callback when component is registered', async () => {
    expect.hasAssertions();
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

  test('setComponentDataValueForKey() should throw an error if component is not initialized', () => {
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
      messageId: expect.any(String),
      sessionKey: expect.any(String),
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
      messageId: expect.any(String),
      sessionKey: expect.any(String),
      api: "component"
    }), expect.any(String));
    const value = componentManager.getComponentDataValueForKey("foo");
    expect(value).toBeUndefined();
  });

  test('isRunningInDesktopApplication() should return false if the environment is web', async () => {
    testSNApp = await createApplication('test-application', Environment.Web, Platform.LinuxWeb);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return false if the environment is mobile', async () => {
    testSNApp = await createApplication('test-application', Environment.Mobile, Platform.Android);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(false);
  });

  test('isRunningInDesktopApplication() should return true if the environment is desktop', async () => {
    testSNApp = await createApplication('test-application', Environment.Desktop, Platform.LinuxDesktop);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInDesktop = componentManager.isRunningInDesktopApplication();
    expect(isRunningInDesktop).toBe(true);
  });

  test('isRunningInMobileApplication() should return false if the environment is web', async () => {
    testSNApp = await createApplication('test-application', Environment.Web, Platform.LinuxWeb);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return false if the environment is desktop', async () => {
    testSNApp = await createApplication('test-application', Environment.Desktop, Platform.LinuxDesktop);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(false);
  });

  test('isRunningInMobileApplication() should return true if the environment is mobile', async () => {
    testSNApp = await createApplication('test-application', Environment.Mobile, Platform.Android);
    await registerComponent(testSNApp, childWindow, testComponent);
    const isRunningInMobile = componentManager.isRunningInMobileApplication();
    expect(isRunningInMobile).toBe(true);
  });

  it('should request permissions when ready', async () => {
    const params = {
      initialPermissions: [
        { name: ComponentAction.StreamContextItem }
      ]
    };
    componentManager.deinit();
    componentManager = new ComponentManager(childWindow, params);
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');
    await registerComponent(testSNApp, childWindow, testComponent);
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      action: ComponentAction.RequestPermissions,
      data: { permissions: params.initialPermissions },
      messageId: expect.any(String),
      sessionKey: expect.any(String),
      api: "component",
    }), expect.any(String));
  });

  test('postMessage payload should be stringified if on mobile', async () => {
    const parentPostMessage = jest.spyOn(childWindow.parent, 'postMessage');

    testSNApp = await createApplication('test-application', Environment.Mobile, Platform.Ios);
    testComponent = await createComponentItem(testSNApp, testExtensionEditorPackage);

    componentManager.deinit();
    componentManager = new ComponentManager(childWindow);
    await registerComponent(testSNApp, childWindow, testComponent);

    // Performing an action so it can call parent.postMessage function.
    componentManager.clearSelection();

    expect(parentPostMessage).toHaveBeenCalledTimes(1);
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String) // TODO: jsdom should report the proper URL and not an empty string
    );
  });

  it('should activate themes when ready, by inserting elements to <head>', async () => {
    const testTheme = await createComponentItem(testSNApp, testThemeDefaultPackage, {
      active: true
    }) as SNTheme;
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

  test('postActiveThemesToComponent() should dispatch messages to activate/deactivate themes', async () => {
    /**
     * Creating an active SNTheme, that will be activated once the component is registered.
     */
    const testThemeDefault = await createComponentItem(testSNApp, testThemeDefaultPackage, {
      active: true
    }) as SNTheme;
    await registerComponent(testSNApp, childWindow, testComponent);
    await registerComponent(testSNApp, childWindow, testComponent);

    /**
     * Creating another active SNTheme.
     * This will be used to replace the previously activated theme.
     */
    const testThemeDark = await createComponentItem(testSNApp, testThemeDarkPackage, {
      active: true
    }) as SNTheme;

    /**
     * Setting active = false so that only the new theme becomes the active theme.
     */
    testSNApp.componentManager.deactivateComponent(testThemeDefault.uuid);

    /**
     * componentManager.postActiveThemesToComponent() will trigger the ActivateTheme action.
     * This should deactivate the Default theme, and activate the Dark theme.
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

  test('streamItems()', async (done) => {
    expect.hasAssertions();

    const savedTestNote = await createNoteItem(testSNApp);
    const contentTypes = [
      ContentType.Note
    ];

    const params = {
      initialPermissions: [
        {
          name: ComponentAction.StreamItems,
          content_types: contentTypes
        }
      ]
    };

    componentManager.deinit();
    componentManager = new ComponentManager(childWindow, params);
    await registerComponent(testSNApp, childWindow, testComponent);

    componentManager.streamItems(contentTypes, (items) => {
      expect(items).not.toBeUndefined();
      expect(items.length).toBeGreaterThanOrEqual(0);
      expect(items[0].uuid).toBe(savedTestNote.uuid);
      done();
    });
  });

  test('streamContextItem()', async () => {
    expect.assertions(8);

    const simpleNote = await createNoteItem(testSNApp, {
      title: 'A simple note',
      text: 'This is a note created for testing purposes.'
    });
    const awesomeNote = await createNoteItem(testSNApp, {
      title: 'Awesome note!',
      text: 'This is not just any note, it\'s an awesome note!'
    });

    const params = {
      initialPermissions: [
        {
          name: ComponentAction.StreamContextItem
        }
      ]
    };

    componentManager.deinit();
    componentManager = new ComponentManager(childWindow, params);
    await registerComponent(testSNApp, childWindow, testComponent);

    let itemInContext;

    componentManager.streamContextItem((item) => {
      itemInContext = item;
    });

    /**
     * Registering a handler to the Editor component area.
     * This is necesary in order to get the item in context.
     * We can later call the `componentManager.contextItemDidChangeInArea()` function.
     */
    
    registerComponentHandler(testSNApp, [ComponentArea.Editor], simpleNote);
    testSNApp.componentManager.contextItemDidChangeInArea(ComponentArea.Editor);

    await sleep(SHORT_DELAY_TIME);

    expect(itemInContext).not.toBeUndefined();
    expect(itemInContext.uuid).toBe(simpleNote.uuid);
    expect(itemInContext.content.title).toBe(simpleNote.title);
    expect(itemInContext.content.text).toBe(simpleNote.text);

    registerComponentHandler(testSNApp, [ComponentArea.Editor], awesomeNote);
    testSNApp.componentManager.contextItemDidChangeInArea(ComponentArea.Editor);

    await sleep(SHORT_DELAY_TIME);

    expect(itemInContext).not.toBeUndefined();
    expect(itemInContext.uuid).toBe(awesomeNote.uuid);
    expect(itemInContext.content.title).toBe(awesomeNote.title);
    expect(itemInContext.content.text).toBe(awesomeNote.text);
  });

  test('selectItem()', async () => {
    expect.hasAssertions();

    const testTagsComponent = await createComponentItem(testSNApp, testExtensionForTagsPackage);

    const testTag1 = await createTagItem(testSNApp, "Test 1");
    const testTag2 = await createTagItem(testSNApp, "Test 2");

    const params = {
      initialPermissions: [
        {
          name: ComponentAction.SelectItem
        }
      ]
    };

    componentManager.deinit();
    componentManager = new ComponentManager(childWindow, params);
    await registerComponent(testSNApp, childWindow, testTagsComponent);

    /**
     * A mock function to check that the action handler is called.
     * We will then check that the return value contains the Tag's UUID and Title.
     */
    const onSelectTag = jest.fn().mockImplementation((data) => data);

    registerComponentHandler(testSNApp, [ComponentArea.NoteTags], testTag1, onSelectTag);
    componentManager.selectItem(testTag1);

    await sleep(SHORT_DELAY_TIME);

    expect(onSelectTag).toReturnWith(
      expect.objectContaining({
        item: expect.objectContaining({
          payload: expect.objectContaining({
            uuid: testTag1.uuid,
          }),
          title: testTag1.title
        })
      })
    );

    registerComponentHandler(testSNApp, [ComponentArea.NoteTags], testTag2, onSelectTag);
    componentManager.selectItem(testTag2);

    await sleep(SHORT_DELAY_TIME);

    expect(onSelectTag).toReturnWith(
      expect.objectContaining({
        item: expect.objectContaining({
          payload: expect.objectContaining({
            uuid: testTag2.uuid,
          }),
          title: testTag2.title
        })
      })
    );
  });
});
