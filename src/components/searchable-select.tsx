"use client";

import { useMemo, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
  meta?: string;
};

type SearchableSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
};

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  className = "",
  searchable = true,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  const inputDisplayValue = useMemo(() => {
    if (!searchable) return selected?.label ?? "";
    return selected ? selected.label : value;
  }, [searchable, selected, value]);

  const visibleOptions = useMemo(() => {
    if (!searchable) return options.slice(0, 20);

    const query = value.trim().toLowerCase();
    const filtered = query
      ? options.filter(
          (option) =>
            option.value.toLowerCase().includes(query) ||
            option.label.toLowerCase().includes(query),
        )
      : options;

    return filtered.slice(0, 20);
  }, [options, searchable, value]);

  return (
    <div className={`relative ${className}`}>
      <input
        value={inputDisplayValue}
        readOnly={!searchable}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(e) => {
          if (!searchable) return;
          onChange(e.target.value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500"
      />
      {isOpen && visibleOptions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-2xl">
          {visibleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            >
              <span>{option.label}</span>
              {option.meta ? (
                <span className="text-xs text-zinc-400">{option.meta}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
