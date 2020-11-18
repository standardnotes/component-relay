import Logger from './../lib/logger';

describe("Logger", () => {
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('should output messages to console anything by default', () => {
    Logger.info('A simple message.');
    expect(Logger.enabled).toBe(false);
    expect(console.log).not.toBeCalled();
  });

  it('should output messages to console if "enabled" is true', () => {
    Logger.enabled = true;
    Logger.info('A simple message.');
    expect(Logger.enabled).toBe(true);
    expect(console.log).toBeCalledTimes(1);
    expect(console.log).toBeCalledWith('A simple message.');
  });

  it('should output errors to console if "enabled" is false', () => {
    Logger.enabled = false;
    Logger.error('An error occured.');
    expect(Logger.enabled).toBe(false);
    expect(console.error).toBeCalledTimes(1);
    expect(console.error).toBeCalledWith('An error occured.');
  });

  it('should output errors to console if "enabled" is true', () => {
    Logger.enabled = true;
    Logger.error('An error occured.');
    expect(Logger.enabled).toBe(true);
    expect(console.error).toBeCalledTimes(1);
    expect(console.error).toBeCalledWith('An error occured.');
  });
});
