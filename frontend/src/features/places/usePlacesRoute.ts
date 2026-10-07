import { useState, useEffect, useMemo, useCallback } from 'react';
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

export function usePlacesRoute() {
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading: isGroupsLoading } = useGroups({ status: 'All' });

  // 1. Fetch canonical places route from database
  const { data: dbPlaces = [], isLoading: isDbPlacesLoading } = useQuery({
    queryKey: ['places-route'],
    queryFn: placesApi.getPlacesRoute,
    staleTime: 60 * 1000,
  });

  // 2. State initialized from localStorage or defaults
  const [routeConfig, setRouteConfig] = useState<PlaceRouteConfig[]>(() => {
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
    return DEFAULT_INITIAL_PLACES.map((item, idx) => ({
      id: normalizeId(item.name),
      name: item.name,
      session: item.session,
      order: idx + 1,
      isCustom: false,
    }));
  });

  // 3. Sync database places when loaded (database is single source of truth)
  useEffect(() => {
    if (dbPlaces && dbPlaces.length > 0) {
      const sortedDb = [...dbPlaces].sort((a, b) => a.order - b.order);
      setRouteConfig(sortedDb);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedDb));
      } catch (e) {
        console.error(e);
      }
    }
  }, [dbPlaces]);

  // 4. Mutation to persist to database permanently
  const { mutateAsync: persistToDb, isPending: isSavingToDb } = useMutation({
    mutationFn: placesApi.updatePlacesRoute,
    onSuccess: (savedData) => {
      queryClient.setQueryData(['places-route'], savedData);
    },
  });

  // Helper to persist locally and to database
  const saveConfig = useCallback(
    async (newConfig: PlaceRouteConfig[]) => {
      // Re-index order 1..N strictly
      const sorted = [...newConfig].map((p, idx) => ({
        ...p,
        order: idx + 1,
      }));
      setRouteConfig(sorted);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      } catch (e) {
        console.error('Failed to save places route config to localStorage', e);
      }
      try {
        await persistToDb(sorted);
      } catch (e) {
        console.error('Failed to persist places route to database', e);
      }
    },
    [persistToDb]
  );

  // 5. Synchronize any newly added locations from active groups without altering existing order
  useEffect(() => {
    if (!groups.length) return;

    setRouteConfig((prevConfig) => {
      const existingNames = new Set(
        prevConfig.map((p) => p.name.trim().toLowerCase())
      );
      const newItems: PlaceRouteConfig[] = [];
      let maxOrder = prevConfig.reduce((max, p) => Math.max(max, p.order || 0), 0);

      for (const g of groups) {
        const loc = (g.location || '').trim();
        if (loc && !existingNames.has(loc.toLowerCase())) {
          existingNames.add(loc.toLowerCase());
          maxOrder += 1;
          newItems.push({
            id: normalizeId(loc),
            name: loc,
            session: 'morning',
            order: maxOrder,
            isCustom: false,
          });
        }
      }

      if (newItems.length > 0) {
        const updated = [...prevConfig, ...newItems];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        // Save to DB in background
        placesApi.updatePlacesRoute(updated).catch(console.error);
        return updated;
      }
      return prevConfig;
    });
  }, [groups]);

  // Compute stats per place based on groups
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

    return [...routeConfig]
      .sort((a, b) => a.order - b.order)
      .map((place) => {
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
  }, [groups, routeConfig]);

  const morningPlaces = useMemo(
    () => placesWithStats.filter((p) => p.session === 'morning'),
    [placesWithStats]
  );

  const eveningPlaces = useMemo(
    () => placesWithStats.filter((p) => p.session === 'evening'),
    [placesWithStats]
  );

  const reorderSessionPlaces = useCallback(
    (session: CollectionSession, reorderedList: PlaceWithGroupStats[]) => {
      const reorderedIds = reorderedList.map((p) => p.id);

      setRouteConfig((prevConfig) => {
        let updated: PlaceRouteConfig[];
        if (session === 'morning') {
          const morningConfigs = reorderedIds
            .map((id) => prevConfig.find((p) => p.id === id))
            .filter((p): p is PlaceRouteConfig => Boolean(p));
          const eveningConfigs = prevConfig.filter((p) => p.session === 'evening');
          updated = [...morningConfigs, ...eveningConfigs];
        } else {
          const morningConfigs = prevConfig.filter((p) => p.session === 'morning');
          const eveningConfigs = reorderedIds
            .map((id) => prevConfig.find((p) => p.id === id))
            .filter((p): p is PlaceRouteConfig => Boolean(p));
          updated = [...morningConfigs, ...eveningConfigs];
        }

        const sorted = updated.map((p, idx) => ({
          ...p,
          order: idx + 1,
        }));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
        } catch (e) {
          console.error('Failed to save places route config', e);
        }
        // Save to DB in background
        placesApi.updatePlacesRoute(sorted).catch(console.error);
        return sorted;
      });
    },
    []
  );

  const moveUp = useCallback(
    (placeId: string) => {
      const target = routeConfig.find((p) => p.id === placeId);
      if (!target) return;
      const sessionList = [...routeConfig.filter((p) => p.session === target.session)];
      const idxInSession = sessionList.findIndex((p) => p.id === placeId);
      if (idxInSession <= 0) return;
      const temp = sessionList[idxInSession - 1];
      sessionList[idxInSession - 1] = sessionList[idxInSession];
      sessionList[idxInSession] = temp;
      reorderSessionPlaces(target.session, sessionList as any);
    },
    [routeConfig, reorderSessionPlaces]
  );

  const moveDown = useCallback(
    (placeId: string) => {
      const target = routeConfig.find((p) => p.id === placeId);
      if (!target) return;
      const sessionList = [...routeConfig.filter((p) => p.session === target.session)];
      const idxInSession = sessionList.findIndex((p) => p.id === placeId);
      if (idxInSession === -1 || idxInSession >= sessionList.length - 1) return;
      const temp = sessionList[idxInSession + 1];
      sessionList[idxInSession + 1] = sessionList[idxInSession];
      sessionList[idxInSession] = temp;
      reorderSessionPlaces(target.session, sessionList as any);
    },
    [routeConfig, reorderSessionPlaces]
  );

  const toggleSession = useCallback(
    (placeId: string) => {
      const target = routeConfig.find((p) => p.id === placeId);
      if (!target) return;
      const newSession: CollectionSession =
        target.session === 'morning' ? 'evening' : 'morning';

      const remaining = routeConfig.filter((p) => p.id !== placeId);
      const updatedTarget: PlaceRouteConfig = { ...target, session: newSession };

      if (newSession === 'morning') {
        const morningItems = remaining.filter((p) => p.session === 'morning');
        const eveningItems = remaining.filter((p) => p.session === 'evening');
        saveConfig([...morningItems, updatedTarget, ...eveningItems]);
      } else {
        saveConfig([...remaining, updatedTarget]);
      }
    },
    [routeConfig, saveConfig]
  );

  const setSession = useCallback(
    (placeId: string, session: CollectionSession) => {
      const updated = routeConfig.map((p) => {
        if (p.id === placeId) {
          return { ...p, session };
        }
        return p;
      });
      saveConfig(updated);
    },
    [routeConfig, saveConfig]
  );

  const addPlace = useCallback(
    (name: string, session: CollectionSession = 'morning') => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const id = normalizeId(trimmed);
      if (
        routeConfig.some(
          (p) => p.id === id || p.name.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return;
      }
      const newPlace: PlaceRouteConfig = {
        id,
        name: trimmed,
        session,
        order: routeConfig.length + 1,
        isCustom: true,
      };
      saveConfig([...routeConfig, newPlace]);
    },
    [routeConfig, saveConfig]
  );

  const removePlace = useCallback(
    (placeId: string) => {
      const updated = routeConfig.filter((p) => p.id !== placeId);
      saveConfig(updated);
    },
    [routeConfig, saveConfig]
  );

  const resetDefault = useCallback(() => {
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
    saveConfig(initialList);
  }, [groups, saveConfig]);

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
    saveCurrentOrder: () => saveConfig(routeConfig),
  };
}
