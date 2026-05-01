import { Suspense } from "react";
import { Filters } from "@/components/Filters";
import { EventGrid } from "@/components/EventGrid";
import { EventMap } from "@/components/EventMap";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewToggle } from "@/components/ViewToggle";
import { MapPin, Zap, Github } from "lucide-react";

interface HomePageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const view = params.view ?? "map";
  const isMapView = view === "map";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Ambient background (list view only — map fills screen) */}
      {!isMapView && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-200/40 blur-[120px]" />
          <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-200/40 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-pink-200/30 blur-[120px]" />
        </div>
      )}

      <div className="relative flex flex-col h-screen">
        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                <MapPin size={13} className="text-white" />
              </div>
              <span className="font-semibold text-sm text-gray-900">Tokyo Events</span>
              <span className="hidden sm:inline-block text-gray-300 text-xs">·</span>
              <span className="hidden sm:inline-block text-gray-400 text-xs">Tech &amp; Creative</span>
            </div>

            {/* Filters (inline in header for map view) */}
            <div className="flex-1 max-w-3xl hidden md:block">
              <Suspense fallback={null}>
                <Filters />
              </Suspense>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 shrink-0">
              <Suspense fallback={null}>
                <ViewToggle current={view} />
              </Suspense>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Github size={15} />
              </a>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile filters (below header row) */}
          <div className="md:hidden border-t border-gray-100 px-4 py-2">
            <Suspense fallback={null}>
              <Filters />
            </Suspense>
          </div>
        </header>

        {/* ── Main content ───────────────────────────────────────────────── */}
        {isMapView ? (
          /* Full-height map */
          <main className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <div className="w-10 h-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              </div>
            }>
              <EventMap />
            </Suspense>
          </main>
        ) : (
          /* Scrollable list view */
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              {/* Hero — only in list view */}
              <div className="text-center max-w-xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs text-gray-500 shadow-sm">
                  <Zap size={11} className="text-yellow-500" />
                  Real-time events from 9 sources
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                  Tokyo Events
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Startup, tech &amp; creative events — aggregated from Luma, Eventbrite, Meetup, Doorkeeper, and more.
                </p>
              </div>

              <Suspense fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-80 rounded-xl bg-gray-200/50 animate-pulse" />
                  ))}
                </div>
              }>
                <EventGrid />
              </Suspense>
            </div>

            <footer className="border-t border-gray-200 mt-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
                <p>Tokyo Events — Tech &amp; Creative</p>
                <div className="flex items-center gap-3">
                  {["Luma", "Eventbrite", "Meetup", "Doorkeeper"].map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </div>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
}
