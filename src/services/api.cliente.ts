// src/services/api.cliente.ts
import { AlmacenamientoAuxiliar } from './storage';
import { API_HOST } from "../config/constantes";

// Detectar si estamos en Android emulator, iOS simulator o dispositivo real
// Para device real en red local: 192.168.100.133:3000
const API_URL = API_HOST;

interface ConsultarOpciones extends RequestInit {
  params?: Record<string, string | number>;
}

// Custom API client using Fetch API
class ApiCliente {
  private baseURL: string;
  private espera: number;

  constructor(baseURL: string, espera: number = 40000) {
    this.baseURL = baseURL;
    this.espera = espera;
  }

  // Helper to add timeout to fetch
  private async consultarConEspera(
  url: string,
  opciones: RequestInit = {})
  : Promise<Response> {
    const controlador = new AbortController();
    const esperaId = setTimeout(() => controlador.abort(), this.espera);

    try {
      const respuesta = await fetch(url, {
        ...opciones,
        signal: controlador.signal
      });
      clearTimeout(esperaId);
      return respuesta;
    } catch (error) {
      clearTimeout(esperaId);
      throw error;
    }
  }

  // Add authorization header
  private async obtenerCabeceras(
  cabeceras: Record<string, string> = {})
  : Promise<Record<string, string>> {
    try {
      const token = AlmacenamientoAuxiliar.obtenerElemento('authToken');
      const predeterminadoCabeceras: Record<string, string> = {
        'Content-Type': 'application/json',
        ...cabeceras
      };

      if (token) {
        predeterminadoCabeceras.Authorization = `Bearer ${token}`;
      } else {
        // Importante: warning útil para endpoints que requieren auth
        console.warn('⚠️ [API] No auth token found');
      }

      return predeterminadoCabeceras;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {
        'Content-Type': 'application/json',
        ...cabeceras
      };
    }
  }

  // Handle response
  private async manejarRespuesta(respuesta: Response): Promise<unknown> {
    if (respuesta.status === 401) {
      // Token expired - clear storage and don't try to refresh
      AlmacenamientoAuxiliar.quitarElemento('authToken');
      AlmacenamientoAuxiliar.quitarElemento('user');
      throw new Error(
        'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
      );
    }

    if (!respuesta.ok) {
      const errorDatos = await respuesta.json().catch(() => ({}));
      throw {
        status: respuesta.status,
        statusText: respuesta.statusText,
        data: errorDatos
      };
    }

    return respuesta.json().catch(() => ({}));
  }

  // Refresh token (disabled - use login instead)
  private async renovarToken(): Promise<void> {
    // Instead of trying to refresh, just logout
    AlmacenamientoAuxiliar.quitarElemento('authToken');
    AlmacenamientoAuxiliar.quitarElemento('user');
    throw new Error(
      'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
    );
  }

  // Build URL with query params
  private construirUrl(
  rutaApi: string,
  parametros?: Record<string, string | number>)
  : string {
    // Ensure endpoint starts with / and add /api prefix if not already present
    const ruta = rutaApi.startsWith('/') ? rutaApi : `/${rutaApi}`;
    const apiRuta = ruta.startsWith('/api') ? ruta : `/api${ruta}`;
    let url = `${this.baseURL}${apiRuta}`;
    if (parametros && Object.keys(parametros).length > 0) {
      const consultaCadena = new URLSearchParams(
        Object.entries(parametros).map(([k, v]) => [k, String(v)])
      ).toString();
      url += `?${consultaCadena}`;
    }
    return url;
  }

  // GET request
  async obtener<T>(rutaApi: string, opciones: ConsultarOpciones = {}): Promise<T> {
    const { params: parametros, ...consultarOpciones } = opciones;
    const url = this.construirUrl(rutaApi, parametros);
    const cabeceras = await this.obtenerCabeceras(
      consultarOpciones.headers as Record<string, string> | undefined
    );
    const respuesta = await this.consultarConEspera(url, {
      method: 'GET',
      ...consultarOpciones,
      headers: cabeceras
    });
    return this.manejarRespuesta(respuesta) as Promise<T>;
  }

  // POST request
  async post<T>(
  rutaApi: string,
  datos?: unknown,
  opciones: ConsultarOpciones = {})
  : Promise<T> {
    const { params: parametros, ...consultarOpciones } = opciones;
    const url = this.construirUrl(rutaApi, parametros);
    const cabeceras = await this.obtenerCabeceras(
      consultarOpciones.headers as Record<string, string> | undefined
    );
    const respuesta = await this.consultarConEspera(url, {
      method: 'POST',
      ...consultarOpciones,
      headers: cabeceras,
      body: datos ? JSON.stringify(datos) : undefined
    });
    return this.manejarRespuesta(respuesta) as Promise<T>;
  }

  // PUT request
  async put<T>(
  rutaApi: string,
  datos?: unknown,
  opciones: ConsultarOpciones = {})
  : Promise<T> {
    const { params: parametros, ...consultarOpciones } = opciones;
    const url = this.construirUrl(rutaApi, parametros);
    const cabeceras = await this.obtenerCabeceras(
      consultarOpciones.headers as Record<string, string> | undefined
    );
    const respuesta = await this.consultarConEspera(url, {
      method: 'PUT',
      ...consultarOpciones,
      headers: cabeceras,
      body: datos ? JSON.stringify(datos) : undefined
    });
    return this.manejarRespuesta(respuesta) as Promise<T>;
  }

  // DELETE request
  async eliminar<T>(rutaApi: string, opciones: ConsultarOpciones = {}): Promise<T> {
    const { params: parametros, ...consultarOpciones } = opciones;
    const url = this.construirUrl(rutaApi, parametros);
    const cabeceras = await this.obtenerCabeceras(
      consultarOpciones.headers as Record<string, string> | undefined
    );
    const respuesta = await this.consultarConEspera(url, {
      method: 'DELETE',
      ...consultarOpciones,
      headers: cabeceras
    });
    return this.manejarRespuesta(respuesta) as Promise<T>;
  }
}

const api = new ApiCliente(API_URL);

export default api;
