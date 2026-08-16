import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type {
  Member,
  MemberCreate,
  MemberStatusUpdate,
  MemberUpdate,
} from '../types';

export const memberApi = {
  getMembers: async (params?: {
    group_id?: string;
    status?: string;
    search?: string;
  }): Promise<Member[]> => {
    const queryParams = new URLSearchParams();
    if (params?.group_id && params.group_id !== 'All') {
      queryParams.append('group_id', params.group_id);
    }
    if (params?.status && params.status !== 'All') {
      queryParams.append('status', params.status);
    }
    if (params?.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }

    const queryStr = queryParams.toString();
    const url = `/members${queryStr ? `?${queryStr}` : ''}`;
    const { data } = await httpClient.get<ApiResponse<Member[]>>(url);
    return data.data;
  },

  getMember: async (id: string): Promise<Member> => {
    const { data } = await httpClient.get<ApiResponse<Member>>(`/members/${id}`);
    return data.data;
  },

  createMember: async (payload: MemberCreate): Promise<Member> => {
    const { data } = await httpClient.post<ApiResponse<Member>>('/members', payload);
    return data.data;
  },

  updateMember: async ({
    id,
    payload,
  }: {
    id: string;
    payload: MemberUpdate;
  }): Promise<Member> => {
    const { data } = await httpClient.put<ApiResponse<Member>>(`/members/${id}`, payload);
    return data.data;
  },

  updateMemberStatus: async ({
    id,
    payload,
  }: {
    id: string;
    payload: MemberStatusUpdate;
  }): Promise<Member> => {
    const { data } = await httpClient.patch<ApiResponse<Member>>(
      `/members/${id}/status`,
      payload,
    );
    return data.data;
  },
};
