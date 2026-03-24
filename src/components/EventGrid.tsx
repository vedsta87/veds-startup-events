"use client";

import { useEvents } from "@/hooks/useEvents";
import { EventCard } from "./EventCard";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { Loader2, SearchX } from "lucide-react";

export function EventGrid() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const source = searchParams.get("source") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useEvents({ q, source, dateFrom, dateTo });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-gray-400" size={28} />
          <p className="text-sm text-gray-400">Loading events...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-500">Failed to load events. Please try again.</p>
      </div>
    );
  }

  const allEvents = data?.pages.flatMap((p) => p.events) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <SearchX size={40} className="text-gray-300" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">No events found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Showing <span className="text-gray-600 font-medium">{allEvents.length}</span> of{" "}
          <span className="text-gray-600 font-medium">{total}</span> events
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="flex items-center justify-center py-8">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading more...
          </div>
        )}
        {!hasNextPage && allEvents.length > 0 && (
          <p className="text-xs text-gray-400">You&apos;ve seen all {total} events</p>
        )}
      </div>
    </div>
  );
}
