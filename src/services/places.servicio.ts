import api from "./api.cliente";

export interface LugarSugerencia {
  placeId: string;
  address: string;
  mainText?: string;
  secondaryText?: string;
  distanceMeters?: number;
  sessionToken: string;
}
export interface LugarResultado {
  placeId?: string;
  address: string;
  display_name: string;
  lat: string;
  lon: string;
}
const nuevoLugaresSesion = () =>
`${Date.now().toString(36)}_${Math.random().
toString(36).
slice(2)}_${Math.random().toString(36).slice(2)}`.slice(0, 36);export { nuevoLugaresSesion };

const lugaresServicio = {
  async autocompletar(
  entrada: string,
  sesionToken: string,
  latitud?: number,
  longitud?: number)
  {
    const respuesta = await api.post<{suggestions: LugarSugerencia[];}>(
      '/lugares/autocompletar',
      { input: entrada, sessionToken: sesionToken, latitude: latitud, longitude: longitud }
    );
    return respuesta.suggestions;
  },
  async detalles(sugerencia: LugarSugerencia) {
    const respuesta = await api.post<{place: LugarResultado;}>('/lugares/detalles', {
      placeId: sugerencia.placeId,
      sessionToken: sugerencia.sessionToken
    });
    return {
      ...respuesta.place,
      address: sugerencia.address,
      display_name: sugerencia.address
    };
  }
};export { lugaresServicio };
