import { httpClient } from '@/lib/axios';
import type { ApiResponse } from '@/types/common';
import type {
  Collection,
  CollectionCreate,
  BulkCollectionResponse,
  TodayCollectionSummary,
  WeeklyCollectionSummary,
  RecordWeekPreviewResponse,
  RecordWeekRequest,
  RecordWeekResponse,
} from '../types';

export const collectionApi = {
  getCollections: async (params?: {
    group_id?: string;
    member_id?: string;
    collector_id?: string;
    payment_date?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<Collection[]> => {
    const queryParams = new URLSearchParams();
    if (params?.group_id && params.group_id !== 'All') {
      queryParams.append('group_id', params.group_id);
    }
    if (params?.member_id && params.member_id !== 'All') {
      queryParams.append('member_id', params.member_id);
    }
    if (params?.collector_id && params.collector_id !== 'All') {
      queryParams.append('collector_id', params.collector_id);
    }
    if (params?.payment_date) {
      queryParams.append('payment_date', params.payment_date);
    }
    if (params?.from_date) {
      queryParams.append('from_date', params.from_date);
    }
    if (params?.to_date) {
      queryParams.append('to_date', params.to_date);
    }

    const queryStr = queryParams.toString();
    const url = `/collections${queryStr ? `?${queryStr}` : ''}`;
    const { data } = await httpClient.get<ApiResponse<Collection[]>>(url);
    return data.data;
  },

  getCollection: async (id: string): Promise<Collection> => {
    const { data } = await httpClient.get<ApiResponse<Collection>>(`/collections/${id}`);
    return data.data;
  },

  getTodayCollections: async (targetDate?: string): Promise<TodayCollectionSummary> => {
    const queryStr = targetDate ? `?target_date=${targetDate}` : '';
    const { data } = await httpClient.get<ApiResponse<TodayCollectionSummary>>(
      `/collections/today${queryStr}`
    );
    return data.data;
  },

  getWeeklySummary: async (groupId?: string): Promise<WeeklyCollectionSummary> => {
    const queryStr = groupId && groupId !== 'All' ? `?group_id=${groupId}` : '';
    const { data } = await httpClient.get<ApiResponse<WeeklyCollectionSummary>>(
      `/collections/weekly${queryStr}`
    );
    return data.data;
  },

  recordCollection: async (payload: CollectionCreate): Promise<Collection> => {
    const { data } = await httpClient.post<ApiResponse<Collection>>('/collections', payload);
    return data.data;
  },

  recordBulkCollections: async (items: CollectionCreate[]): Promise<BulkCollectionResponse> => {
    const { data } = await httpClient.post<ApiResponse<BulkCollectionResponse>>('/collections/bulk', { items });
    return data.data;
  },

  previewRecordWeek: async (params?: {
    payment_date?: string;
    business_week?: number;
    group_ids?: string[];
  }): Promise<RecordWeekPreviewResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.payment_date) queryParams.append('payment_date', params.payment_date);
    if (params?.business_week) queryParams.append('business_week', String(params.business_week));
    if (params?.group_ids && params.group_ids.length > 0) {
      params.group_ids.forEach((gid) => queryParams.append('group_ids', gid));
    }
    const queryStr = queryParams.toString();
    const url = `/collections/record-week/preview${queryStr ? `?${queryStr}` : ''}`;
    const { data } = await httpClient.get<ApiResponse<RecordWeekPreviewResponse>>(url);
    return data.data;
  },

  recordWholeWeek: async (payload: RecordWeekRequest): Promise<RecordWeekResponse> => {
    const { data } = await httpClient.post<ApiResponse<RecordWeekResponse>>('/collections/record-week', payload);
    return data.data;
  },
};
