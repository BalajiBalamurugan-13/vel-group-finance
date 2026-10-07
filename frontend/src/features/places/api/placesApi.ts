import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type { PlaceRouteConfig } from '../types';

export const placesApi = {
  getPlacesRoute: async (): Promise<PlaceRouteConfig[]> => {
    const { data } = await httpClient.get<ApiResponse<PlaceRouteConfig[]>>(
      '/settings/places-route'
    );
    return data.data || [];
  },

  updatePlacesRoute: async (
    places: PlaceRouteConfig[]
  ): Promise<PlaceRouteConfig[]> => {
    const { data } = await httpClient.put<ApiResponse<PlaceRouteConfig[]>>(
      '/settings/places-route',
      { places }
    );
    return data.data || [];
  },
};
