"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Event } from "@/lib/mockEvents";

interface EventsPage {
  events: Event[];
  hasMore: boolean;
  total: number;
  page: number;
  stale?: boolean;
}

interface AllEventsResult {
  events: Event[];
  total: number;
  stale?: boolean;
}

export interface FetchParams {
  q: string;
  source: string;
  category: string;
  timeFilter: string;
  dateFrom: string;
  dateTo: string;
}

async function fetchEventsPage(
  params: FetchParams & { page: number }
): Promise<EventsPage> {
  const sp = new URLSearchParams();
  if (params.q)          sp.set("q",          params.q);
  if (params.source)     sp.set("source",     params.source);
  if (params.category)   sp.set("category",   params.category);
  if (params.timeFilter) sp.set("timeFilter", params.timeFilter);
  if (params.dateFrom)   sp.set("dateFrom",   params.dateFrom);
  if (params.dateTo)     sp.set("dateTo",     params.dateTo);
  sp.set("page",  String(params.page));
  sp.set("limit", "20");

  const res = await fetch(`/api/events?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

async function fetchAllEvents(params: FetchParams): Promise<AllEventsResult> {
  const sp = new URLSearchParams();
  if (params.q)          sp.set("q",          params.q);
  if (params.source)     sp.set("source",     params.source);
  if (params.category)   sp.set("category",   params.category);
  if (params.timeFilter) sp.set("timeFilter", params.timeFilter);
  if (params.dateFrom)   sp.set("dateFrom",   params.dateFrom);
  if (params.dateTo)     sp.set("dateTo",     params.dateTo);
  sp.set("all", "true");

  const res = await fetch(`/api/events?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

/** Paginated — used by the list (EventGrid) view */
export function useEvents(params: FetchParams) {
  return useInfiniteQuery({
    queryKey: ["events", params],
    queryFn: ({ pageParam }) =>
      fetchEventsPage({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

/** All events in one shot — used by the map view */
export function useMapEvents(params: FetchParams) {
  return useQuery({
    queryKey: ["events-all", params],
    queryFn: () => fetchAllEvents(params),
    staleTime: 1000 * 60 * 2,
  });
}
