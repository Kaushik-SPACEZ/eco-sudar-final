import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryComboboxProps {
  /** Existing distinct categories to choose from. */
  options: string[];
  /** Current category value (free text — may or may not be in `options`). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Extra classes on the trigger button — e.g. "h-8 text-sm" inside a table row. */
  triggerClassName?: string;
}

/**
 * A creatable category picker: pick an existing category or type a brand-new one.
 * Categories aren't a table of their own — they're the distinct `category` values
 * across the purchase catalog — so "add new" is simply typing a value that isn't
 * in the list yet. The dropdown is portaled to <body> so it's never clipped by a
 * scroll container (e.g. the line-items table).
 */
export function CategoryCombobox({
  options,
  value,
  onChange,
  placeholder = "Select or add…",
  disabled,
  className,
  triggerClassName,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);

  const q = query.trim();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options;
  const exact = options.some((o) => o.toLowerCase() === q.toLowerCase());
  const canCreate = q !== "" && !exact;

  const position = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom + 4, width: r.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    position();
    const handler = () => position();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  const handleOpen = () => {
    if (disabled) return;
    position();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canCreate) choose(q);
      else if (filtered.length === 1) choose(filtered[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close on any outside click. A document-level mousedown listener is used instead
  // of the input's onBlur because inside a Radix dialog the focus-trap can keep the
  // input from ever blurring, leaving the menu stuck open. Clicks on the trigger or
  // inside the menu are ignored (menu clicks are handled by their own onMouseDown).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm transition-colors",
          "hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
          open && "ring-2 ring-ring",
          triggerClassName,
        )}
      >
        <span className={cn("truncate text-left", value ? "text-foreground" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && rect && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", left: rect.left, top: rect.top, width: rect.width, zIndex: 60 }}
          className="rounded-md border bg-popover shadow-md overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type a new category…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {value && (
              <li
                onMouseDown={(e) => { e.preventDefault(); choose(""); }}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear category
              </li>
            )}
            {filtered.map((opt) => {
              const active = opt.toLowerCase() === value.toLowerCase();
              return (
                <li
                  key={opt}
                  onMouseDown={(e) => { e.preventDefault(); choose(opt); }}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none text-sm transition-colors",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                </li>
              );
            })}
            {filtered.length === 0 && !canCreate && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No categories yet</li>
            )}
          </ul>

          {canCreate && (
            <div className="border-t">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); choose(q); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Create “{q}”
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
