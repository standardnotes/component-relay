import { Environment, Platform } from "@standardnotes/snjs";

/**
 * The message that is first sent to register the component.
 */
export const componentRegisteredMessage = {
  action: 'component-registered',
  sessionKey: 'session-key',
  componentData: {
    foo: "bar"
  },
  data: {
    uuid: "component-uuid",
    environment: Environment.Web,
    platform: Platform.LinuxWeb,
    themes: [],
    original: {}
  },
  api: "component",
};
