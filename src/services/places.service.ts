import api from './api.client';

export interface PlaceSuggestion {
  placeId: string;
  address: string;
  mainText?: string;
  secondaryText?: string;
  distanceMeters?: number;
  sessionToken: string;
}
export interface PlaceResult {
  placeId?: string;
  address: string;
  display_name: string;
  lat: string;
  lon: string;
}
export const newPlacesSession = () =>
  `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2)}_${Math.random().toString(36).slice(2)}`.slice(0, 36);

export const placesService = {
  async autocomplete(
    input: string,
    sessionToken: string,
    latitude?: number,
    longitude?: number,
  ) {
    const response = await api.post<{ suggestions: PlaceSuggestion[] }>(
      '/places/autocomplete',
      { input, sessionToken, latitude, longitude },
    );
    return response.suggestions;
  },
  async details(suggestion: PlaceSuggestion) {
    const response = await api.post<{ place: PlaceResult }>('/places/details', {
      placeId: suggestion.placeId,
      sessionToken: suggestion.sessionToken,
    });
    return {
      ...response.place,
      address: suggestion.address,
      display_name: suggestion.address,
    };
  },
};
