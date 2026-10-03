import type { PlaceRouteConfig, PlaceWithGroupStats, CollectionSession } from '../types';

/**
 * Standardize place names and group locations for consistent route matching.
 * Handles casing, spacing, and minor Tamil character variants (e.g. ு vs ூ).
 */
export function normalizePlaceKey(str?: string | null): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[\u0020\u00A0\t\r\n]+/g, ' ')
    // Normalize Tamil U vs UU variations if present
    .replace(/நள்ளுர்/g, 'நள்ளூர்')
    .replace(/\s+/g, '-');
}

export interface PlaceRouteInfo {
  id: string;
  name: string;
  session: CollectionSession;
  order: number;
}

/**
 * Builds a fast lookup map from place name/id to PlaceRouteInfo.
 */
export function buildPlaceLookupMap(
  places: Array<PlaceRouteConfig | PlaceWithGroupStats>,
): Map<string, PlaceRouteInfo> {
  const map = new Map<string, PlaceRouteInfo>();

  places.forEach((p) => {
    const info: PlaceRouteInfo = {
      id: p.id,
      name: p.name,
      session: p.session,
      order: p.order,
    };
    map.set(normalizePlaceKey(p.name), info);
    map.set(p.id.toLowerCase(), info);
    map.set(normalizePlaceKey(p.id), info);
    map.set(p.name.trim().toLowerCase(), info);
  });

  return map;
}

/**
 * Resolves route info for a given location or group name against the configured places.
 */
export function resolvePlaceRouteInfo(
  location: string | undefined | null,
  groupName: string | undefined | null,
  placeLookup: Map<string, PlaceRouteInfo>,
  places: Array<PlaceRouteConfig | PlaceWithGroupStats>,
): PlaceRouteInfo {
  // 1. Try normalized location
  if (location) {
    const norm = normalizePlaceKey(location);
    if (placeLookup.has(norm)) return placeLookup.get(norm)!;
    const rawLower = location.trim().toLowerCase();
    if (placeLookup.has(rawLower)) return placeLookup.get(rawLower)!;
  }

  // 2. Try substring match against configured places
  const testText = `${location || ''} ${groupName || ''}`.trim().toLowerCase();
  for (const p of places) {
    const pName = p.name.trim().toLowerCase();
    if (pName && testText.includes(pName)) {
      return {
        id: p.id,
        name: p.name,
        session: p.session,
        order: p.order,
      };
    }
  }

  // 3. Fallback for unconfigured location
  return {
    id: normalizePlaceKey(location || 'other'),
    name: location?.trim() || 'Other',
    session: 'morning',
    order: 9999,
  };
}

export interface RouteSortableGroup {
  id?: string;
  group_name: string;
  location?: string | null;
  group_code?: string | null;
}

/**
 * Sorts groups according to the configured Places & Routes:
 * 1. Morning (☀️) sessions before Evening (🌙)
 * 2. Place Route Stop Order (1, 2, 3...)
 * 3. Group running number (e.g. Group 1, Group 2, Group 10)
 */
export function sortGroupsByRoute<T extends RouteSortableGroup>(
  groups: T[],
  places: Array<PlaceRouteConfig | PlaceWithGroupStats>,
): T[] {
  const lookup = buildPlaceLookupMap(places);

  return [...groups].sort((a, b) => {
    const infoA = resolvePlaceRouteInfo(a.location, a.group_name, lookup, places);
    const infoB = resolvePlaceRouteInfo(b.location, b.group_name, lookup, places);

    // Session order: Morning before Evening
    const sessionOrderA = infoA.session === 'morning' ? 0 : 1;
    const sessionOrderB = infoB.session === 'morning' ? 0 : 1;
    if (sessionOrderA !== sessionOrderB) {
      return sessionOrderA - sessionOrderB;
    }

    // Route order: Stop 1, Stop 2, etc.
    if (infoA.order !== infoB.order) {
      return infoA.order - infoB.order;
    }

    // Natural group name sort (e.g. "பழையபாளையம் 1" before "பழையபாளையம் 2")
    return a.group_name.localeCompare(b.group_name, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

export interface RouteSortableMember {
  id: string;
  group_id?: string | null;
  group_name?: string | null;
  location?: string | null;
  member_name: string;
  member_code?: string | null;
}

/**
 * Sorts members according to the configured Places & Routes:
 * 1. Member's group route order (Morning -> Evening, Stop 1..N)
 * 2. Group running number
 * 3. Member name / code
 */
export function sortMembersByRoute<T extends RouteSortableMember>(
  members: T[],
  groups: Array<{ id: string; group_name: string; location?: string | null }>,
  places: Array<PlaceRouteConfig | PlaceWithGroupStats>,
): T[] {
  const groupMap = new Map<string, { group_name: string; location?: string | null }>();
  groups.forEach((g) => groupMap.set(g.id, g));

  const lookup = buildPlaceLookupMap(places);

  return [...members].sort((a, b) => {
    const grpA = (a.group_id ? groupMap.get(a.group_id) : null) || {
      group_name: a.group_name || '',
      location: a.location || null,
    };
    const grpB = (b.group_id ? groupMap.get(b.group_id) : null) || {
      group_name: b.group_name || '',
      location: b.location || null,
    };

    const infoA = resolvePlaceRouteInfo(grpA.location, grpA.group_name, lookup, places);
    const infoB = resolvePlaceRouteInfo(grpB.location, grpB.group_name, lookup, places);

    // Session order: Morning before Evening
    const sessionOrderA = infoA.session === 'morning' ? 0 : 1;
    const sessionOrderB = infoB.session === 'morning' ? 0 : 1;
    if (sessionOrderA !== sessionOrderB) {
      return sessionOrderA - sessionOrderB;
    }

    // Route order: Stop 1, Stop 2, etc.
    if (infoA.order !== infoB.order) {
      return infoA.order - infoB.order;
    }

    // Group name order
    const grpComp = grpA.group_name.localeCompare(grpB.group_name, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    if (grpComp !== 0) return grpComp;

    // Member code or name order
    const codeA = a.member_code || a.member_name;
    const codeB = b.member_code || b.member_name;
    return codeA.localeCompare(codeB, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

export interface RouteOptGroup<T> {
  label: string;
  placeName: string;
  session: CollectionSession;
  order: number;
  options: T[];
}

/**
 * Groups already route-sorted groups into optgroups keyed by place and session
 * for rendering structured <optgroup> in dropdown selects.
 */
export function buildRouteGroupOptgroups<T extends RouteSortableGroup>(
  sortedGroups: T[],
  places: Array<PlaceRouteConfig | PlaceWithGroupStats>,
): Array<RouteOptGroup<T>> {
  const lookup = buildPlaceLookupMap(places);
  const groupsByPlace = new Map<string, RouteOptGroup<T>>();

  sortedGroups.forEach((g) => {
    const info = resolvePlaceRouteInfo(g.location, g.group_name, lookup, places);
    const sessionIcon = info.session === 'morning' ? '☀️' : '🌙';
    const sessionLabel = info.session === 'morning' ? 'Morning' : 'Evening';
    const key = `${info.session}-${info.order}-${info.name}`;

    if (!groupsByPlace.has(key)) {
      const stopNumber = info.order < 9000 ? `#${info.order} ` : '';
      groupsByPlace.set(key, {
        label: `${sessionIcon} ${stopNumber}${info.name} (${sessionLabel})`,
        placeName: info.name,
        session: info.session,
        order: info.order,
        options: [],
      });
    }

    groupsByPlace.get(key)!.options.push(g);
  });

  return Array.from(groupsByPlace.values());
}
