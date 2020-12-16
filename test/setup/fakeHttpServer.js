import nock from 'nock';
import { htmlTemplate } from '../helpers';

nock('http://app.standardnotes.test')
  .persist()
  .get(/(parent|extensions)(.*)/)
  .reply(200, htmlTemplate, { 'Content-Type': 'text/html; charset=UTF-8', })
  .get(/themes(.*)/)
  .reply(200, "");
