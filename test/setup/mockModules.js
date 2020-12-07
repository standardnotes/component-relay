/**
 * Mocking the Utils module, specifically the generateUuid function.
 */
jest.mock('./../../lib/utils', () => {
  const actualModule = jest.requireActual('./../../lib/utils');
  return {
    __esModule: true,
    ...actualModule,
    generateUuid: () => "fake-uuid"
  };
});
