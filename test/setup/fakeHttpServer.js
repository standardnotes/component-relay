import nock from 'nock';
import { htmlTemplate } from '../helpers';

nock('http://app.standardnotes.test')
  .persist()
  .get(/(parent|extensions)(.*)/)
  .reply(200, htmlTemplate)
  .get(/themes(.*)/)
  .reply(200, "");
