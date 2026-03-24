import { Suspense } from "react";
import { Filters } from "@/components/Filters";
import { EventGrid } from "@/components/EventGrid";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MapPin, Zap, Github } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-200/40 blur-[120px]" />
        <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-200/40 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-pink-200/30 blur-[120px]" />
      </div>

      <div className="relative">
        {/* Nav */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                <MapPin size={13} className="text-white" />
              </div>
              <span className="font-semibold text-sm text-gray-900">Ved&apos;s Events</span>
              <span className="hidden sm:inline-block text-gray-300 text-xs">·</span>
              <span className="hidden sm:inline-block text-gray-400 text-xs">Startups & Tech</span>
            </div>
            <div className="flex items-center gap-2">
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
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          {/* Hero */}
          <div className="space-y-6 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs text-gray-500 shadow-sm">
              <Zap size={11} className="text-yellow-500" />
              Live events from Doorkeeper & Luma
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                Ved&apos;s Startup
                <br />
                <span className="text-3xl sm:text-4xl md:text-5xl text-gray-400">Events</span>
              </h1>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Discover the best startup, tech, and innovation events happening in Tokyo — aggregated in one place.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="max-w-3xl mx-auto">
            <Suspense fallback={<div className="h-20 rounded-xl bg-gray-200/50 animate-pulse" />}>
              <Filters />
            </Suspense>
          </div>

          {/* Event Grid */}
          <Suspense fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-80 rounded-xl bg-gray-200/50 animate-pulse" />
              ))}
            </div>
          }>
            <EventGrid />
          </Suspense>
        </main>

        <footer className="border-t border-gray-200 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>Ved&apos;s Startup Events — aggregating the best of Tokyo tech</p>
            <div className="flex items-center gap-4">
              <a href="https://www.doorkeeper.jp" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Doorkeeper</a>
              <a href="https://lu.ma" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Luma</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
