export type CollectionSession = 'morning' | 'evening';

export interface PlaceRouteConfig {
  id: string;
  name: string;
  session: CollectionSession;
  order: number;
  isCustom?: boolean;
}

export interface PlaceWithGroupStats extends PlaceRouteConfig {
  groupCount: number;
  memberCount: number;
  totalWeeklyTarget: number;
}
