import { ImageURISource } from 'react-native';
import { API_HOST } from '../config/constants';
import { StorageHelper } from '../services/storage';

// Never send the bearer token to third-party avatar URLs or local file URIs.
export function privateImageSource(uri: string): ImageURISource {
  const resolvedUri = uri.startsWith('/api/users/') && uri.endsWith('/profile-photo')
    ? `${API_HOST}${uri}` : uri;
  const internal = resolvedUri.startsWith(`${API_HOST}/uploads/`) ||
    resolvedUri.startsWith(`${API_HOST}/api/requests/file/`) ||
    resolvedUri.startsWith(`${API_HOST}/api/identity/evidence/`) ||
    resolvedUri.startsWith(`${API_HOST}/api/users/`) && resolvedUri.endsWith('/profile-photo');
  return internal ? { uri: resolvedUri, headers: { Authorization: `Bearer ${StorageHelper.getItem('authToken') || ''}` } } : { uri: resolvedUri };
}
