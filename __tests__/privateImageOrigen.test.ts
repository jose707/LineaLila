jest.mock("../src/config/constantes", () => ({ API_HOST: 'https://api.example.test' }));
jest.mock('../src/services/storage', () => ({ AlmacenamientoAuxiliar: { obtenerElemento: () => 'test-token' } }));
import { privadoImagenOrigen } from "../src/utils/privateImageOrigen";

test('authenticates private images on the configured backend', () => {
  expect(privadoImagenOrigen('https://api.example.test/archivos/conductores/ci.png')).toEqual({
    uri: 'https://api.example.test/archivos/conductores/ci.png', headers: { Authorization: 'Bearer test-token' }
  });
});

test('resolves and authenticates a verified profile photo path', () => {
  expect(privadoImagenOrigen('/api/usuarios/123/foto-perfil')).toEqual({
    uri: 'https://api.example.test/api/usuarios/123/foto-perfil',
    headers: { Authorization: 'Bearer test-token' }
  });
});

test.each([
'https://avatars.example.test/photo.png',
'https://api.example.test.attacker.test/uploads/ci.png',
'file:///camera/photo.jpg',
'data:image/png;base64,AAAA']
)('does not disclose tokens to %s', (uri) => {
  expect(privadoImagenOrigen(uri)).toEqual({ uri });
});
