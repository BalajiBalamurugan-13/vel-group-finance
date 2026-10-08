import { useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGroups } from '@/features/groups';
import { placesApi } from './api/placesApi';
import type { PlaceRouteConfig, PlaceWithGroupStats, CollectionSession } from './types';

const STORAGE_KEY = 'vel_finance_places_route_config';

/** Default initial route sequence for Vel Finance */
const DEFAULT_INITIAL_PLACES: Array<{ name: string; session: CollectionSession }> = [
  { name: 'பழையபாளையம்', session: 'morning' },
  { name: 'கீழவள்ளம்', session: 'morning' },
  { name: 'கடைக்கண்விநாயகநள்ளுர்', session: 'morning' },
  { name: 'பச்சைமாதானம்', session: 'morning' },
  { name: 'திருநகிரி', session: 'morning' },
  { name: 'பெரியநிம்மேளி', session: 'evening' },
  { name: 'பாலகாட்டுத்தெரு , TKM', session: 'evening' },
  { name: 'சுபி தெரு - TKM', session: 'evening' },
  { name: 'சுள்ளான் தெரு - PTM', session: 'evening' },
];

function normalizeId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Global debounce timer to prevent drag-reorder rapid-fire network requests */
let reorderDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function usePlacesRoute() {
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading: isGroupsLoading } = useGroups({ status: 'All' });

  // 1. Fetch canonical places route from database (the ONLY authoritative source of truth)
  const { data: dbPlaces = [], isLoading: isDbPlacesLoading } = useQuery<PlaceRouteConfig[]>({
    queryKey: ['places-route'],
    queryFn: placesApi.getPlacesRoute,
    staleTime: 30 * 1000,
  });

  // 2. Read offline localStorage fallback if available
  const cachedFromStorage = useMemo<PlaceRouteConfig[] | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse places route config from localStorage', e);
    }
    return null;
  }, []);

  // 3. Derive base configured list: Database is authoritative; fallback to localStorage or defaults
  const baseList: PlaceRouteConfig[] = useMemo(() => {
    if (dbPlaces && dbPlaces.length > 0) {
      return [...dbPlaces].sort((a, b) => a.order - b.order);
    }
    if (cachedFromStorage && cachedFromStorage.length > 0) {
      return [...cachedFromStorage].sort((a, b) => a.order - b.order);
    }
    return DEFAULT_INITIAL_PLACES.map((item, idx) => ({
      id: normalizeId(item.name),
      name: item.name,
      session: item.session,
      order: idx + 1,
      isCustom: false,
    }));
  }, [dbPlaces, cachedFromStorage]);

  // Sync latest authoritative database configuration to localStorage for offline cache
  useEffect(() => {
    if (dbPlaces && dbPlaces.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dbPlaces));
      } catch (e) {
        console.error('Failed to sync dbPlaces to localStorage', e);
      }
    }
  }, [dbPlaces]);

  // 4. Mutation to persist to database permanently
  const { mutateAsync: persistToDb, isPending: isSavingToDb } = useMutation({
    mutationFn: placesApi.updatePlacesRoute,
    onSuccess: (savedData) => {
      queryClient.setQueryData(['places-route'], savedData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
      } catch (e) {
        console.error(e);
      }
    },
  });

  // Helper to persist strictly ordered list locally and to database
  const saveConfig = useCallback(
    async (newConfig: PlaceRouteConfig[]) => {
      if (reorderDebounceTimer) {
        clearTimeout(reorderDebounceTimer);
        reorderDebounceTimer = null;
      }

      // Group morning then evening, strictly re-index order 1..N
      const morningItems = newConfig.filter((p) => p.session === 'morning');
      const eveningItems = newConfig.filter((p) => p.session === 'evening');
      const sorted: PlaceRouteConfig[] = [...morningItems, ...eveningItems].map((p, idx) => ({
        id: p.id,
        name: p.name,
        session: p.session,
        order: idx + 1,
        isCustom: p.isCustom,
      }));

      // Immediate cache & storage update
      queryClient.setQueryData(['places-route'], sorted);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      } catch (e) {
        console.error('Failed to save places route config to localStorage', e);
      }

      // Persist to database
      try {
        await persistToDb(sorted);
      } catch (e) {
        console.error('Failed to persist places route to database', e);
        throw e;
      }
    },
    [queryClient, persistToDb]
  );

  // 5. Dynamic computation of stats and graceful in-memory inclusion of any new group locations
  // CRITICAL ARCHITECTURE NOTE:
  // We NEVER auto-save to the database in background on page mount or groups load!
  // Any newly detected location is displayed in-memory only until explicitly saved by the user on /places.
  const placesWithStats: PlaceWithGroupStats[] = useMemo(() => {
    const statsMap = new Map<
      string,
      { groupCount: number; memberCount: number; target: number }
    >();

    for (const g of groups) {
      const loc = (g.location || '').trim();
      const normLoc = normalizeId(loc);
      const curr = statsMap.get(normLoc) || {
        groupCount: 0,
        memberCount: 0,
        target: 0,
      };
      curr.groupCount += 1;
      curr.memberCount += g.member_count || 0;
      curr.target +=
        (g.member_count || 0) *
        (g.weekly_installment || g.scheme?.weekly_installment || 760);
      statsMap.set(normLoc, curr);
    }

    // Merge any locations in active groups that are not yet in the base configured list
    const existingNames = new Set(
      baseList.map((p) => p.name.trim().toLowerCase())
    );
    const unconfiguredPlaces: PlaceRouteConfig[] = [];
    let maxOrder = baseList.reduce((max, p) => Math.max(max, p.order || 0), 0);

    for (const g of groups) {
      const loc = (g.location || '').trim();
      if (loc && !existingNames.has(loc.toLowerCase())) {
        existingNames.add(loc.toLowerCase());
        maxOrder += 1;
        unconfiguredPlaces.push({
          id: normalizeId(loc),
          name: loc,
          session: 'morning',
          order: maxOrder,
          isCustom: false,
        });
      }
    }

    const merged = [...baseList, ...unconfiguredPlaces];

    return merged.map((place) => {
      const stats =
        statsMap.get(place.id) ||
        statsMap.get(normalizeId(place.name)) || {
          groupCount: 0,
          memberCount: 0,
          target: 0,
        };
      return {
        ...place,
        groupCount: stats.groupCount,
        memberCount: stats.memberCount,
        totalWeeklyTarget: stats.target,
      };
    });
  }, [baseList, groups]);

  const morningPlaces = useMemo(
    () => placesWithStats.filter((p) => p.session === 'morning').sort((a, b) => a.order - b.order),
    [placesWithStats]
  );

  const eveningPlaces = useMemo(
    () => placesWithStats.filter((p) => p.session === 'evening').sort((a, b) => a.order - b.order),
    [placesWithStats]
  );

  const reorderSessionPlaces = useCallback(
    (session: CollectionSession, reorderedList: PlaceWithGroupStats[]) => {
      const morningItems =
        session === 'morning'
          ? reorderedList
          : placesWithStats.filter((p) => p.session === 'morning');
      const eveningItems =
        session === 'evening'
          ? reorderedList
          : placesWithStats.filter((p) => p.session === 'evening');

      const sorted: PlaceRouteConfig[] = [...morningItems, ...eveningItems].map((p, idx) => ({
        id: p.id,
        name: p.name,
        session: p.session,
        order: idx + 1,
        isCustom: p.isCustom,
      }));

      // 1. Immediately update React Query cache for zero-latency interactive dragging
      queryClient.setQueryData(['places-route'], sorted);

      // 2. Sync to localStorage for offline cache
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      } catch (e) {
        console.error('Failed to save places route config', e);
      }

      // 3. Debounce database persistence so dragging does NOT spam parallel HTTP requests
      if (reorderDebounceTimer) {
        clearTimeout(reorderDebounceTimer);
      }
      reorderDebounceTimer = setTimeout(() => {
        persistToDb(sorted).catch((err) => {
          console.error('Failed to auto-persist places route order to DB', err);
        });
      }, 800);
    },
    [placesWithStats, queryClient, persistToDb]
  );

  const moveUp = useCallback(
    (placeId: string) => {
      const target = placesWithStats.find((p) => p.id === placeId);
      if (!target) return;
      const sessionList = placesWithStats
        .filter((p) => p.session === target.session)
        .sort((a, b) => a.order - b.order);
      const idxInSession = sessionList.findIndex((p) => p.id === placeId);
      if (idxInSession <= 0) return;
      const nextList = [...sessionList];
      const temp = nextList[idxInSession - 1];
      nextList[idxInSession - 1] = nextList[idxInSession];
      nextList[idxInSession] = temp;
      reorderSessionPlaces(target.session, nextList);
    },
    [placesWithStats, reorderSessionPlaces]
  );

  const moveDown = useCallback(
    (placeId: string) => {
      const target = placesWithStats.find((p) => p.id === placeId);
      if (!target) return;
      const sessionList = placesWithStats
        .filter((p) => p.session === target.session)
        .sort((a, b) => a.order - b.order);
      const idxInSession = sessionList.findIndex((p) => p.id === placeId);
      if (idxInSession === -1 || idxInSession >= sessionList.length - 1) return;
      const nextList = [...sessionList];
      const temp = nextList[idxInSession + 1];
      nextList[idxInSession + 1] = nextList[idxInSession];
      nextList[idxInSession] = temp;
      reorderSessionPlaces(target.session, nextList);
    },
    [placesWithStats, reorderSessionPlaces]
  );

  const toggleSession = useCallback(
    async (placeId: string) => {
      const target = placesWithStats.find((p) => p.id === placeId);
      if (!target) return;
      const newSession: CollectionSession =
        target.session === 'morning' ? 'evening' : 'morning';

      const remaining = placesWithStats.filter((p) => p.id !== placeId);
      const updatedTarget: PlaceRouteConfig = {
        id: target.id,
        name: target.name,
        session: newSession,
        order: target.order,
        isCustom: target.isCustom,
      };

      if (newSession === 'morning') {
        const morningItems = remaining.filter((p) => p.session === 'morning');
        const eveningItems = remaining.filter((p) => p.session === 'evening');
        await saveConfig([...morningItems, updatedTarget, ...eveningItems]);
      } else {
        await saveConfig([...remaining, updatedTarget]);
      }
    },
    [placesWithStats, saveConfig]
  );

  const setSession = useCallback(
    async (placeId: string, session: CollectionSession) => {
      const updated = placesWithStats.map((p) => {
        if (p.id === placeId) {
          return {
            id: p.id,
            name: p.name,
            session,
            order: p.order,
            isCustom: p.isCustom,
          };
        }
        return {
          id: p.id,
          name: p.name,
          session: p.session,
          order: p.order,
          isCustom: p.isCustom,
        };
      });
      await saveConfig(updated);
    },
    [placesWithStats, saveConfig]
  );

  const addPlace = useCallback(
    async (name: string, session: CollectionSession = 'morning') => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const id = normalizeId(trimmed);
      if (
        placesWithStats.some(
          (p) => p.id === id || p.name.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return;
      }
      const newPlace: PlaceRouteConfig = {
        id,
        name: trimmed,
        session,
        order: placesWithStats.length + 1,
        isCustom: true,
      };
      const cleanList: PlaceRouteConfig[] = placesWithStats.map((p) => ({
        id: p.id,
        name: p.name,
        session: p.session,
        order: p.order,
        isCustom: p.isCustom,
      }));
      await saveConfig([...cleanList, newPlace]);
    },
    [placesWithStats, saveConfig]
  );

  const removePlace = useCallback(
    async (placeId: string) => {
      const updated = placesWithStats
        .filter((p) => p.id !== placeId)
        .map((p) => ({
          id: p.id,
          name: p.name,
          session: p.session,
          order: p.order,
          isCustom: p.isCustom,
        }));
      await saveConfig(updated);
    },
    [placesWithStats, saveConfig]
  );

  const resetDefault = useCallback(async () => {
    const knownNames = new Set(
      DEFAULT_INITIAL_PLACES.map((d) => d.name.toLowerCase())
    );
    const initialList: PlaceRouteConfig[] = DEFAULT_INITIAL_PLACES.map(
      (item, idx) => ({
        id: normalizeId(item.name),
        name: item.name,
        session: item.session,
        order: idx + 1,
        isCustom: false,
      })
    );

    let maxOrder = initialList.length;
    for (const g of groups) {
      const loc = (g.location || '').trim();
      if (loc && !knownNames.has(loc.toLowerCase())) {
        knownNames.add(loc.toLowerCase());
        maxOrder += 1;
        initialList.push({
          id: normalizeId(loc),
          name: loc,
          session: 'morning',
          order: maxOrder,
          isCustom: false,
        });
      }
    }
    await saveConfig(initialList);
  }, [groups, saveConfig]);

  const saveCurrentOrder = useCallback(async () => {
    if (reorderDebounceTimer) {
      clearTimeout(reorderDebounceTimer);
      reorderDebounceTimer = null;
    }
    const morningList = placesWithStats.filter((p) => p.session === 'morning').sort((a, b) => a.order - b.order);
    const eveningList = placesWithStats.filter((p) => p.session === 'evening').sort((a, b) => a.order - b.order);
    const cleanList: PlaceRouteConfig[] = [...morningList, ...eveningList].map((p, idx) => ({
      id: p.id,
      name: p.name,
      session: p.session,
      order: idx + 1,
      isCustom: p.isCustom,
    }));
    await saveConfig(cleanList);
  }, [placesWithStats, saveConfig]);

  return {
    places: placesWithStats,
    morningPlaces,
    eveningPlaces,
    isGroupsLoading: isGroupsLoading || isDbPlacesLoading,
    isSaving: isSavingToDb,
    moveUp,
    moveDown,
    setSession,
    toggleSession,
    reorderSessionPlaces,
    addPlace,
    removePlace,
    resetDefault,
    saveCurrentOrder,
  };
}
