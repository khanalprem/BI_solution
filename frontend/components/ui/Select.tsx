'use client';

import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';

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
