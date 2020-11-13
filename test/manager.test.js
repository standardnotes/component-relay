import jsdom from 'jsdom';
import ComponentManager from './../lib/componentManager';

const htmlTemplate = `<!doctype html>
  <html>
    <head></head>
    <body>
      <div id="root"></div>
    </body>
  </html>`;

describe("ComponentManager", () => {
  beforeAll(() => {
    global.document = new jsdom.JSDOM(htmlTemplate, {
      url: 'http://localhost',
    });
    global.window = document.window;
  });

  test('initialization without parameters', () => {
    const componentManager = new ComponentManager();
    expect(componentManager).not.toBeUndefined();
  });

  test('initialization with onReady parameter', () => {
    const onReadyCb = jest.fn();
    const componentManager = new ComponentManager({
      onReady: onReadyCb
    });
    expect(componentManager).not.toBeUndefined();
    expect(onReadyCb).toBeCalled();
  });
});
