"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Event } from "@/lib/mockEvents";

interface EventsPage {
  events: Event[];
  hasMore: boolean;
  total: number;
  page: number;
}

interface FetchParams {
  q: string;
  source: string;
  dateFrom: string;
  dateTo: string;
}

async function fetchEvents(params: FetchParams & { page: number }): Promise<EventsPage> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.source) sp.set("source", params.source);
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  sp.set("page", String(params.page));
  sp.set("limit", "20");

  const res = await fetch(`/api/events?${sp.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export function useEvents(params: FetchParams) {
  return useInfiniteQuery({
    queryKey: ["events", params],
    queryFn: ({ pageParam }) => fetchEvents({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}
