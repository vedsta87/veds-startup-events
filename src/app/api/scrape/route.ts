import { NextRequest, NextResponse } from "next/server";
import { getEvents, getCacheStatus, invalidateCache } from "@/lib/scraper.worker";
import type { EventCategory } from "@/lib/mockEvents";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city     = searchParams.get("city") ?? "tokyo";
  const category = (searchParams.get("category") ?? undefined) as EventCategory | undefined;

  const status = getCacheStatus(city, category);
  return NextResponse.json({ city, category, ...status });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    city?: string;
    category?: EventCategory;
    force?: boolean;
  };

  const city     = body.city     ?? "tokyo";
  const category = body.category ?? undefined;
  const force    = body.force    ?? false;

  if (force) {
    invalidateCache(city);
  }

  // Kick off background refresh — response returns immediately
  void getEvents(city, category);

  const status = getCacheStatus(city, category);
  return NextResponse.json({ triggered: true, city, category, ...status });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? undefined;
  invalidateCache(city);
  return NextResponse.json({ invalidated: true, city: city ?? "all" });
}
