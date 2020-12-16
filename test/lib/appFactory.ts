import { SNApplication, Environment, Platform, SNLog, SNComponentManager } from '@standardnotes/snjs';
import DummyDeviceInterface from './dummyDeviceInterface';
import DummyWebCrypto from './dummyWebCrypto';
import MobileComponentManager from './mobileComponentManager';

const getSwappedClasses = (environment: Environment) => {
  switch (environment) {
    case Environment.Mobile:
      return [
        {
          swap: SNComponentManager,
          with: MobileComponentManager,
        },
      ];
    default:
      return undefined;
  }
};

export const createApplication = (identifier: string, environment: Environment, platform: Platform) => {
  const deviceInterface = new DummyDeviceInterface(
    setTimeout.bind(window),
    setInterval.bind(window)
  );
  SNLog.onLog = (message) => {
    console.log(message);
  };
  SNLog.onError = (error) => {
    console.error(error);
  };
  const application = new SNApplication(
    environment,
    platform,
    deviceInterface,
    new DummyWebCrypto(),
    {
      confirm: async () => true,
      alert: async () => {},
      blockingDialog: () => () => {},
    },
    identifier,
    getSwappedClasses(environment),
    undefined,
    'http://syncing.localhost'
  );
  return application;
};
