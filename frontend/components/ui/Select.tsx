'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Checkbox } from './checkbox';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function Select({ value, onChange, options, placeholder = 'Select...', disabled = false }: SelectProps) {
  const selectedOption = options.find(opt => opt.value === value) || { value: '', label: placeholder };
  
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <Listbox.Button
          className={`
            relative w-full bg-bg-input border border-border rounded-md px-3 py-1.5 pr-8
            text-text-primary text-xs text-left outline-none transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-border-strong focus:border-accent-blue'}
          `}
        >
          <span className={selectedOption.value ? '' : 'text-text-muted'}>
            {selectedOption.label}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-4 w-4 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="
              absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg
              bg-bg-card border border-border shadow-lg
              py-1 text-xs focus:outline-none
            "
          >
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 px-3 transition-colors ${
                    active ? 'bg-accent-blue-dim text-accent-blue' : 'text-text-secondary'
                  }`
                }
              >
                {({ selected }) => (
                  <span className={`block truncate ${selected ? 'font-semibold text-text-primary' : 'font-normal'}`}>
                    {option.label}
                    {selected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-accent-blue">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

// Multi-select variant
interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function MultiSelect({ value, onChange, options, placeholder = 'Select...' }: MultiSelectProps) {
  const selectedLabels = value.length > 0 
    ? value.map(v => options.find(opt => opt.value === v)?.label).filter(Boolean).join(', ')
    : placeholder;
  
  return (
    <Listbox value={value} onChange={onChange} multiple>
      <div className="relative">
        <Listbox.Button
          className="
            relative w-full bg-bg-input border border-border rounded-md px-3 py-1.5 pr-8
            text-text-primary text-xs text-left outline-none transition-all
            cursor-pointer hover:border-border-strong focus:border-accent-blue
          "
        >
          <span className={value.length > 0 ? '' : 'text-text-muted'}>
            {selectedLabels}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-4 w-4 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="
              absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg
              bg-bg-card border border-border shadow-lg
              py-1 text-xs focus:outline-none
            "
          >
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 px-3 pl-8 transition-colors ${
                    active ? 'bg-accent-blue-dim text-accent-blue' : 'text-text-secondary'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-accent-blue">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    <span className={`block truncate ${selected ? 'font-semibold text-text-primary' : 'font-normal'}`}>
                      {option.label}
                    </span>
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

interface SearchableMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  mode?: 'single' | 'multi';
}

export function SearchableMultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  mode = 'multi',
}: SearchableMultiSelectProps) {
  const isSingle = mode === 'single';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const RENDER_CAP = 500;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const visibleOptions = useMemo(
    () => (filteredOptions.length > RENDER_CAP ? filteredOptions.slice(0, RENDER_CAP) : filteredOptions),
    [filteredOptions],
  );
  const hiddenCount = filteredOptions.length - visibleOptions.length;

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedLabels = useMemo(() => {
    if (value.length === 0) return placeholder;

    const labels = value
      .map((selectedValue) => options.find((option) => option.value === selectedValue)?.label ?? selectedValue)
      .filter(Boolean);

    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [options, placeholder, value]);

  const toggleOption = (nextValue: string) => {
    if (isSingle) {
      if (selectedSet.has(nextValue)) {
        onChange([]);
      } else {
        onChange([nextValue]);
      }
      setIsOpen(false);
      return;
    }

    if (selectedSet.has(nextValue)) {
      onChange(value.filter((item) => item !== nextValue));
      return;
    }

    onChange([...value, nextValue]);
  };

  const selectAllFiltered = () => {
    const combined = new Set(value);
    filteredOptions.forEach((option) => combined.add(option.value));
    onChange(Array.from(combined));
  };

  const clearFiltered = () => {
    if (query.trim()) {
      const filteredValues = new Set(filteredOptions.map((option) => option.value));
      onChange(value.filter((item) => !filteredValues.has(item)));
      return;
    }

    onChange([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((current) => !current)}
        className={`
          relative w-full bg-bg-input border border-border rounded-md px-3 py-1.5 pr-8
          text-text-primary text-xs text-left outline-none transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-border-strong focus:border-accent-blue'}
        `}
      >
        <span className={value.length > 0 ? '' : 'text-text-muted'}>
          {selectedLabels}
        </span>
        {value.length > 0 && (
          <span className="absolute inset-y-0 right-7 flex items-center text-[10px] font-semibold text-accent-blue">
            {value.length}
          </span>
        )}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg className="h-4 w-4 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full min-w-[240px] overflow-hidden rounded-lg border border-border bg-bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
            />
          </div>

          {!isSingle && (
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-accent-blue hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearFiltered}
                className="text-text-muted hover:text-accent-red hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-text-muted">No results found</div>
            ) : (
              visibleOptions.map((option) => {
                const checked = selectedSet.has(option.value);

                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-accent-blue-dim hover:text-text-primary"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleOption(option.value)}
                    />
                    <span className={`truncate ${checked ? 'font-semibold text-text-primary' : ''}`}>
                      {option.label}
                    </span>
                  </label>
                );
              })
            )}
            {hiddenCount > 0 && (
              <div className="px-3 py-2 text-[10.5px] text-text-muted border-t border-border">
                Showing first {visibleOptions.length.toLocaleString()} of {filteredOptions.length.toLocaleString()} — type to narrow results.
              </div>
            )}
          </div>

          <div className="border-t border-border px-3 py-2 text-[10px] text-text-muted">
            {value.length} selected
          </div>
        </div>
      )}
    </div>
  );
}

// Searchable Select variant
interface SearchableSelectProps extends SelectProps {
  searchable?: boolean;
}

export function SearchableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  disabled = false 
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  
  const filteredOptions = query === ''
    ? options
    : options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase())
      );
  
  const selectedOption = options.find(opt => opt.value === value) || { value: '', label: placeholder };
  
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <Listbox.Button
          className={`
            relative w-full bg-bg-input border border-border rounded-md px-3 py-1.5 pr-8
            text-text-primary text-xs text-left outline-none transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-border-strong focus:border-accent-blue'}
          `}
        >
          <span className={selectedOption.value ? '' : 'text-text-muted'}>
            {selectedOption.label}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-4 w-4 text-text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="
              absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg
              bg-bg-card border border-border shadow-lg
              text-xs focus:outline-none
            "
          >
            <div className="sticky top-0 p-2 bg-bg-card border-b border-border">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-bg-input border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-accent-blue"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-text-muted">No results found</div>
              ) : (
                filteredOptions.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 px-3 transition-colors ${
                        active ? 'bg-accent-blue-dim text-accent-blue' : 'text-text-secondary'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <span className={`block truncate ${selected ? 'font-semibold text-text-primary' : 'font-normal'}`}>
                        {option.label}
                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-accent-blue">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </span>
                    )}
                  </Listbox.Option>
                ))
              )}
            </div>
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
