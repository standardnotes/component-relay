import ComponentManager from './../lib/componentManager';

const postMessage = async (message: Object, targetOrigin: string) => {
  window.postMessage(message, targetOrigin);

  /**
   * window.postMesasge() implementation is wrapped with setTimeout.
   * See https://github.com/jsdom/jsdom/issues/2245#issuecomment-392556153
   */
  await new Promise(resolve => setTimeout(resolve, 10));
};

const componentRegisteredMessage = {
  action: 'component-registered',
  sessionKey: 'session-key',
  componentData: {
    foo: "bar"
  },
  data: {
    uuid: "component-uuid",
    environment: "web",
    platform: "linux",
    isMobile: false,
    themes: [],
    original: {}
  },
  api: "component",
};

const registeredComponentAction = async () => {
  await postMessage(componentRegisteredMessage, '*');
};

describe("ComponentManager", () => {
  let componentManager: ComponentManager;
  let onReady: jest.Mock;

  beforeEach(() => {
    onReady = jest.fn();
    componentManager = new ComponentManager({
      onReady,
    });
  });

  afterEach(() => {
    /**
     * TODO: need a way to reliably reset JSDOM environment after each test.
     * This is because Jest does not clean the JSDOM document after each test run.
     * It only clears the DOM after all tests inside an entire file are completed.
     */
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

  /**
   * This test will fail because JSDOM is not reset after each test. Looking a solution for this ATM.
   */
  test('getSelfComponentUUID() before the component is registered should be undefined', async () => {
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
});
