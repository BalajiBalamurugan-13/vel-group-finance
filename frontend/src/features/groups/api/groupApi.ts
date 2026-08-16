import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type {
  Group,
  GroupCreate,
  GroupStatusUpdate,
  GroupSuggestNameResponse,
  GroupUpdate,
} from '../types';

export const groupApi = {
  getGroups: async (params?: {
    status?: string;
    location?: string;
    search?: string;
  }): Promise<Group[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status && params.status !== 'All') {
      queryParams.append('status', params.status);
    }
    if (params?.location && params.location.trim()) {
      queryParams.append('location', params.location.trim());
    }
    if (params?.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }

    const queryStr = queryParams.toString();
    const url = `/groups${queryStr ? `?${queryStr}` : ''}`;
    const { data } = await httpClient.get<ApiResponse<Group[]>>(url);
    return data.data;
  },

  getGroup: async (id: string): Promise<Group> => {
    const { data } = await httpClient.get<ApiResponse<Group>>(`/groups/${id}`);
    return data.data;
  },

  suggestGroupName: async (location: string): Promise<GroupSuggestNameResponse> => {
    const { data } = await httpClient.get<ApiResponse<GroupSuggestNameResponse>>(
      `/groups/suggest-name?location=${encodeURIComponent(location.trim())}`,
    );
    return data.data;
  },

  createGroup: async (payload: GroupCreate): Promise<Group> => {
    const { data } = await httpClient.post<ApiResponse<Group>>('/groups', payload);
    return data.data;
  },

  updateGroup: async ({
    id,
    payload,
  }: {
    id: string;
    payload: GroupUpdate;
  }): Promise<Group> => {
    const { data } = await httpClient.put<ApiResponse<Group>>(`/groups/${id}`, payload);
    return data.data;
  },

  updateGroupStatus: async ({
    id,
    payload,
  }: {
    id: string;
    payload: GroupStatusUpdate;
  }): Promise<Group> => {
    const { data } = await httpClient.patch<ApiResponse<Group>>(
      `/groups/${id}/status`,
      payload,
    );
    return data.data;
  },
};
