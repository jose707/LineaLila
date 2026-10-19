jest.mock('../src/config/constants', () => ({ API_HOST: 'https://api.example.test' }));
jest.mock('../src/services/storage', () => ({ StorageHelper: { getItem: () => 'test-token' } }));
import { privateImageSource } from '../src/utils/privateImageSource';

test('authenticates private images on the configured backend', () => {
  expect(privateImageSource('https://api.example.test/uploads/drivers/ci.png')).toEqual({
    uri: 'https://api.example.test/uploads/drivers/ci.png', headers: { Authorization: 'Bearer test-token' },
  });
});

test('resolves and authenticates a verified profile photo path', () => {
  expect(privateImageSource('/api/users/123/profile-photo')).toEqual({
    uri: 'https://api.example.test/api/users/123/profile-photo',
    headers: { Authorization: 'Bearer test-token' },
  });
});

test.each([
  'https://avatars.example.test/photo.png',
  'https://api.example.test.attacker.test/uploads/ci.png',
  'file:///camera/photo.jpg',
  'data:image/png;base64,AAAA',
])('does not disclose tokens to %s', uri => {
  expect(privateImageSource(uri)).toEqual({ uri });
});
