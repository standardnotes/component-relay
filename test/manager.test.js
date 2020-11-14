import ComponentManager from './../lib/componentManager';

describe("ComponentManager", () => {
  test('initialization without parameters', () => {
    const componentManager = new ComponentManager();
    expect(componentManager).not.toBeUndefined();
  });

  test('initialization with onReady parameter', async function () {
    const onReadyCallback = jest.fn();
    const componentManager = new ComponentManager({
      onReady: onReadyCallback,
      options: {}
    });

    const messageData = {
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
      componentData: {},
      messageId: "",
      sessionKey: "",
      api: "",
      original: "",
    };
    window.postMessage(messageData, '*');

    /**
     * window.postMesasge() implementation is wrapped with setTimeout.
     * See https://github.com/jsdom/jsdom/issues/2245#issuecomment-392556153
     */
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onReadyCallback).toBeCalledTimes(1);
  });
});
