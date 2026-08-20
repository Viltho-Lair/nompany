"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ensureFontCatalog, useFontCatalog } from "@/hooks/use-font-catalog";
import { fontStack, loadFonts } from "@/lib/docs/fonts";
import { cn } from "@/lib/utils";

/** How many families are previewed at once — one stylesheet request per batch. */
const VISIBLE_LIMIT = 40;

/**
 * Searchable picker over the whole Google Fonts catalogue. Only the families
 * currently on screen have their webfonts fetched, so opening the picker costs
 * one request rather than 1,950.
 */
export function FontPicker({
  value,
  sizePt,
  onSelect,
  onSetAsDefault,
}: {
  value: string;
  /** Shown on the "set as default" button, which applies size as well. */
  sizePt: number;
  onSelect: (family: string, category: string) => void;
  onSetAsDefault?: (family: string, category: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const catalog = useFontCatalog();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool =
      needle === ""
        ? catalog.fonts
        : catalog.fonts.filter((font) =>
            font.family.toLowerCase().includes(needle),
          );
    return pool.slice(0, VISIBLE_LIMIT);
  }, [catalog.fonts, query]);

  // Preview what is on screen. `loadFonts` dedupes, so re-running is cheap.
  if (matches.length > 0) {
    loadFonts(matches.map((font) => font.family));
  }

  const selected = catalog.fonts.find((font) => font.family === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Started from the event, not from render.
        if (next) ensureFontCatalog();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-40 justify-between gap-1 px-2 font-normal"
          aria-label="Font"
        >
          <span
            className="truncate"
            style={{ fontFamily: fontStack(value, selected?.category) }}
          >
            {value}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search 1,900+ fonts"
            className="h-7 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {catalog.status === "loading" && (
            <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading fonts…
            </p>
          )}

          {catalog.status === "error" && (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              Could not reach Google Fonts. Check the connection and the
              GOOGLE_FONTS_API_KEY.
            </p>
          )}

          {catalog.status === "ready" && matches.length === 0 && (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No font matches “{query}”.
            </p>
          )}

          {matches.map((font) => (
            <button
              key={font.family}
              type="button"
              onClick={() => {
                onSelect(font.family, font.category);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted",
                font.family === value && "bg-muted/60",
              )}
            >
              <span
                className="truncate"
                style={{ fontFamily: fontStack(font.family, font.category) }}
              >
                {font.family}
              </span>
              {font.family === value && <Check className="size-3.5 shrink-0" />}
            </button>
          ))}

          {catalog.status === "ready" &&
            query.trim() === "" &&
            catalog.fonts.length > VISIBLE_LIMIT && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Showing the {VISIBLE_LIMIT} most popular of{" "}
                {catalog.fonts.length.toLocaleString()} — search for more.
              </p>
            )}
        </div>

        {onSetAsDefault && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onSetAsDefault(value, selected?.category ?? "sans-serif");
                setOpen(false);
              }}
            >
              Set default: {value}, {sizePt}pt
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
