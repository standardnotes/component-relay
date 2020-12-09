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
    activeThemeUrls: [],
    original: {}
  },
  api: "component",
};

/**
 * The message that is sent to activate themes.
 */
export const componentActivateThemesMessage = {
  action: 'themes',
  sessionKey: 'session-key',
  data: {
    uuid: "component-uuid",
    environment: Environment.Web,
    platform: Platform.LinuxWeb,
    themes: [
      "http://localhost:8080"
    ],
    original: {}
  },
  api: "component",
};
