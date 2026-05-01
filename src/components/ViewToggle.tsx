"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Map, List } from "lucide-react";

interface ViewToggleProps {
  current: string;
}

export function ViewToggle({ current }: ViewToggleProps) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  function switchView(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => switchView("map")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          current === "map"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
        aria-label="Map view"
      >
        <Map size={13} />
        <span className="hidden sm:inline">Map</span>
      </button>
      <button
        onClick={() => switchView("list")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          current === "list"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
        aria-label="List view"
      >
        <List size={13} />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
