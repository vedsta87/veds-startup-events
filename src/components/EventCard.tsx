"use client";

import { Event } from "@/lib/mockEvents";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import Image from "next/image";

interface EventCardProps {
  event: Event;
}

const sourceConfig = {
  doorkeeper: {
    label: "Doorkeeper",
    className: "bg-orange-50 text-orange-600 border-orange-200",
  },
  luma: {
    label: "Luma",
    className: "bg-violet-50 text-violet-600 border-violet-200",
  },
};

export function EventCard({ event }: EventCardProps) {
  const src = sourceConfig[event.source];
  const eventDate = new Date(event.date);
  const relative = formatDistanceToNow(eventDate, { addSuffix: true });
  const formatted = format(eventDate, "EEE, MMM d · h:mm a");

  return (
    <Card className="group overflow-hidden border border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-200 transition-all duration-300 hover:-translate-y-0.5">
      <div className="relative h-44 overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3">
          <Badge
            variant="outline"
            className={`text-xs font-semibold border ${src.className}`}
          >
            {src.label}
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3 text-xs text-white/80 bg-black/30 rounded-full px-2 py-1 backdrop-blur-sm flex items-center gap-1">
          <Users size={11} />
          {event.attendees}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-gray-900">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="shrink-0 text-blue-500" />
            <span className="truncate">{formatted}</span>
            <span className="text-gray-400 shrink-0" suppressHydrationWarning>· {relative}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={12} className="shrink-0 text-pink-500" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="pl-[20px] text-gray-400 truncate text-[11px]">
            {event.address}
          </div>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {event.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 border-0"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full mt-1 bg-gray-900 text-white hover:bg-gray-700 font-medium text-xs h-8 group/btn inline-flex items-center justify-center"
          )}
        >
          View Event
          <ExternalLink
            size={11}
            className="ml-1.5 transition-transform group-hover/btn:translate-x-0.5"
          />
        </a>
      </CardContent>
    </Card>
  );
}
