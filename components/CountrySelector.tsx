import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { countriesToFlags } from '../lib/utils';

interface CountrySelectorProps {
  selectedCountries: string[];
  onChange: (selected: string[]) => void;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({ selectedCountries, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const countries = useLiveQuery(() => db.countries.orderBy('name').toArray());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const toggleCountry = (code: string) => {
    if (selectedCountries.includes(code)) {
      onChange(selectedCountries.filter(c => c !== code));
    } else {
      onChange([...selectedCountries, code].sort());
    }
  };

  const filteredCountries = countries?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-left h-10 overflow-hidden"
      >
        <span className="truncate block">
            {selectedCountries.length > 0 ? countriesToFlags(selectedCountries) : 'Selecteer landen...'}
        </span>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Zoek land..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600 sticky top-0"
          />
          <ul>
            {filteredCountries?.map(country => (
              <li
                key={country.code}
                onClick={() => toggleCountry(country.code)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer flex items-center"
              >
                <input
                  type="checkbox"
                  checked={selectedCountries.includes(country.code)}
                  readOnly
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="mr-2">{countriesToFlags([country.code])}</span> 
                {country.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};