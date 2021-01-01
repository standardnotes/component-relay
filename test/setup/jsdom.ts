import { JSDOM } from 'jsdom';
import { htmlTemplate } from './../helpers';

const { window } = new JSDOM(htmlTemplate, {
  resources: "usable",
});

global.window.confirm = (message) => false;
global.window.open = (url) => null;
global.document = window.document;
