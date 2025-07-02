"use client";

import { useState, useRef } from "react";
import { US_STATES } from '@const/locations';

interface StateDropdownProps {
  value: string;
  onChange: (val: string) => void;
  name: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  variant?: 'dark' | 'light';
}

export function StateDropdown({ 
  value, 
  onChange, 
  name, 
  className,
  placeholder = "State (e.g. TX)",
  required = false,
  variant = 'light'
}: StateDropdownProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filtered = US_STATES.filter(
    s =>
      s.value.toLowerCase().includes(search.toLowerCase()) ||
      s.label.toLowerCase().includes(search.toLowerCase())
  );
  
  // Default styling based on variant
  const defaultClassName = variant === 'dark' 
    ? "w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:border-[#E6B325] focus:ring-0"
    : "w-full px-4 py-2 rounded-md bg-black border border-[#E6B325]/30 text-[#E6B325] focus:border-[#E6B325] focus:ring-0";
  
  const dropdownClassName = variant === 'dark'
    ? "absolute z-10 bg-gray-800 border border-gray-700 rounded-md mt-1 w-full max-h-48 overflow-y-auto"
    : "absolute z-10 bg-black border border-[#E6B325]/30 rounded-md mt-1 w-full max-h-48 overflow-y-auto";
  
  const optionClassName = variant === 'dark'
    ? (isSelected: boolean) => `px-4 py-2 cursor-pointer hover:bg-gray-700 text-white ${isSelected ? 'bg-gray-600' : ''}`
    : (isSelected: boolean) => `px-4 py-2 cursor-pointer hover:bg-[#E6B325]/10 text-[#E6B325] ${isSelected ? 'bg-[#E6B325]/20' : ''}`;
  
  const noResultsClassName = variant === 'dark' ? "px-4 py-2 text-gray-300" : "px-4 py-2 text-[#E6B325]";
  
  const handleFocus = () => setOpen(true);
  const handleBlur = () => setTimeout(() => setOpen(false), 100);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    onChange(e.target.value.toUpperCase());
  };
  const handleSelect = (stateValue: string) => {
    onChange(stateValue);
    setSearch(stateValue);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        className={className || defaultClassName}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        required={required}
      />
      {open && (
        <div className={dropdownClassName}>
          {filtered.length === 0 && (
            <div className={noResultsClassName}>No results</div>
          )}
          {filtered.map(s => (
            <div
              key={s.value}
              className={optionClassName(s.value === value)}
              onMouseDown={() => handleSelect(s.value)}
            >
              {s.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 