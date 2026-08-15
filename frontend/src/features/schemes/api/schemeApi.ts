import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type { Scheme, SchemeCreate, SchemeUpdate, SchemeStatusUpdate } from '../types';

export const schemeApi = {
  getSchemes: async (): Promise<Scheme[]> => {
    const { data } = await httpClient.get<ApiResponse<Scheme[]>>('/schemes');
    return data.data;
  },

  getScheme: async (id: string): Promise<Scheme> => {
    const { data } = await httpClient.get<ApiResponse<Scheme>>(`/schemes/${id}`);
    return data.data;
  },

  createScheme: async (payload: SchemeCreate): Promise<Scheme> => {
    const { data } = await httpClient.post<ApiResponse<Scheme>>('/schemes', payload);
    return data.data;
  },

  updateScheme: async ({ id, payload }: { id: string; payload: SchemeUpdate }): Promise<Scheme> => {
    const { data } = await httpClient.put<ApiResponse<Scheme>>(`/schemes/${id}`, payload);
    return data.data;
  },

  updateSchemeStatus: async ({ id, payload }: { id: string; payload: SchemeStatusUpdate }): Promise<Scheme> => {
    const { data } = await httpClient.patch<ApiResponse<Scheme>>(`/schemes/${id}/status`, payload);
    return data.data;
  },
};
