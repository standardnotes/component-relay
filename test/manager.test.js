import ComponentManager from './../lib/componentManager';

const postMessage = async (message, targetOrigin) => {
  window.postMessage(message, targetOrigin);

  /**
   * window.postMesasge() implementation is wrapped with setTimeout.
   * See https://github.com/jsdom/jsdom/issues/2245#issuecomment-392556153
   */
  await new Promise(resolve => setTimeout(resolve, 10));
};

const componentRegisteredMessage = {
  action: 'component-registered',
  data: {
    sessionKey: 'session-key',
    componentData: {},
    uuid: "component-uuid",
    origin: "http://localhost",
    data: {},
    environment: "web",
    platform: "linux",
    isMobile: false,
    acceptsThemes: true,
    activeThemes: [],
    activeThemeUrls: []
  },
  api: "component",
};

const registeredComponentAction = async () => {
  await postMessage(componentRegisteredMessage, '*');
};

describe("ComponentManager", () => {
  let componentManager;
  let onReady;

  beforeEach(() => {
    onReady = jest.fn();
    componentManager = new ComponentManager({
      onReady,
    });
  });

  afterEach(() => {
    componentManager = undefined;
  });

  it('should not be undefined', () => {
    expect(componentManager).not.toBeUndefined();
  });

  it('should not run onReady callback when component has not been registered', async () => {
    expect(onReady).toBeCalledTimes(0);
  });

  it('should run onReady callback when component is registered', async () => {
    await registeredComponentAction();
    expect(onReady).toBeCalledTimes(1);
  });

  test('getSelfComponentUUID() before the component is registered should be undefined', async () => {
    const componentManager = new ComponentManager({
      onReady,
    });
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).toBeUndefined();
  });

  test('getSelfComponentUUID() after the component is registered should not be undefined', async () => {
    await registeredComponentAction();
    const uuid = componentManager.getSelfComponentUUID();
    expect(uuid).not.toBeUndefined();
    expect(uuid).toBe(componentRegisteredMessage.data.uuid);
  });
});
