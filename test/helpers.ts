import { ContentType } from '@standardnotes/snjs';
import { generateUuid } from './../lib/utils';

export const htmlTemplate = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>`;

export const testExtensionPackage = {
  identifier: "test.standardnotes.my-test-extension",
  name: "My Test Extension",
  content_type: "SN|Component",
  area: "editor-editor",
  version: "1.0.0",
  url: "http://localhost/extensions/my-test-extension"
};

export const testThemeDefaultPackage = {
  identifier: "test.standardnotes.default-theme",
  name: "Default Theme",
  content_type: "SN|Theme",
  area: "themes",
  version: "1.0.0",
  url: "http://localhost/themes/default"
};

export const testThemeDarkPackage = {
  identifier: "test.standardnotes.dark-theme",
  name: "Dark Theme",
  content_type: "SN|Theme",
  area: "themes",
  version: "1.0.0",
  url: "http://localhost/themes/dark"
};

export const getTestNoteItem = ({ title = 'Hello', text = 'World', dirty = true } = {}) => {
  return {
    uuid: generateUuid(),
    content_type: ContentType.Note,
    dirty,
    content: {
      title,
      text
    },
    references: []
  };
};

const copyObject = (object: any) => {
  const objectStr = JSON.stringify(object);
  return JSON.parse(objectStr);
};

export const getRawTestComponentItem = (componentPackage: any) => {
  const today = new Date();
  componentPackage = copyObject(componentPackage);
  return {
    content_type: componentPackage.content_type,
    content: {
      uuid: generateUuid(),
      identifier: componentPackage.identifier,
      componentData: {
        foo: "bar"
      },
      name: componentPackage.name,
      hosted_url: componentPackage.url,
      url: componentPackage.url,
      local_url: null,
      area: componentPackage.area,
      package_info: componentPackage,
      valid_until: new Date(today.setFullYear(today.getFullYear() + 5)),
      references: []
    }
  };
};

export const sleep = async (seconds: number) => {
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
};
