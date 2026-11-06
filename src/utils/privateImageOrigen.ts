import { ImageURISource as ImagenUriOrigen } from 'react-native';
import { API_HOST } from "../config/constantes";
import { AlmacenamientoAuxiliar } from '../services/storage';

// No envíes el token Bearer a las URL de avatares de terceros ni a las URI de archivos locales.
function privadoImagenOrigen(uri: string): ImagenUriOrigen {
  const actualizarRuta = (ruta: string) => ruta
    .replace(/^\/api\/users\/([^/]+)\/profile-photo$/, '/api/usuarios/$1/foto-perfil')
    .replace(/^\/uploads\/drivers\//, '/archivos/conductores/');
  uri = uri.startsWith(`${API_HOST}/`) ? `${API_HOST}${actualizarRuta(uri.slice(API_HOST.length))}` : actualizarRuta(uri);
  const resueltoUri = uri.startsWith('/archivos/') || uri.startsWith('/uploads/') || uri.startsWith('/api/solicitudes/archivo/') ||
  uri.startsWith('/api/administracion/solicitudes/') && uri.includes('/vista-previa-ocr/') ||
  uri.startsWith('/api/identity/evidence/') ||
  uri.startsWith('/api/administracion/usuarios/') && uri.includes('/evidencia-identidad/') ||
  uri.startsWith('/api/usuarios/') && uri.endsWith('/foto-perfil') ?
  `${API_HOST}${uri}` : uri;
  const esInterna = resueltoUri.startsWith(`${API_HOST}/archivos/`) || resueltoUri.startsWith(`${API_HOST}/uploads/`) ||
  resueltoUri.startsWith(`${API_HOST}/api/solicitudes/archivo/`) ||
  resueltoUri.startsWith(`${API_HOST}/api/administracion/solicitudes/`) && resueltoUri.includes('/vista-previa-ocr/') ||
  resueltoUri.startsWith(`${API_HOST}/api/identity/evidence/`) ||
  resueltoUri.startsWith(`${API_HOST}/api/administracion/usuarios/`) && resueltoUri.includes('/evidencia-identidad/') ||
  resueltoUri.startsWith(`${API_HOST}/api/usuarios/`) && resueltoUri.endsWith('/foto-perfil');
  return esInterna ? { uri: resueltoUri, headers: { Authorization: `Bearer ${AlmacenamientoAuxiliar.obtenerElemento('authToken') || ''}` } } : { uri: resueltoUri };
}export { privadoImagenOrigen };
