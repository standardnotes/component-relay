import { JSDOM } from 'jsdom';
import { htmlTemplate } from './../helpers';

const { window } = new JSDOM(htmlTemplate, {
  resources: "usable",
});

global.window = window;
global.window.confirm = () => true;
global.document = window.document;
global.navigator = {
  userAgent: 'node.js',
};
