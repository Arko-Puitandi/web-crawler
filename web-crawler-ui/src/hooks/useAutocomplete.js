// src/hooks/useAutocomplete.js
import { useState, useCallback } from 'react';

export const useAutocomplete = (options) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const handleInputChange = useCallback((value) => {
    if (value.trim().length > 0) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
      setShowAutocomplete(filtered.length > 0);
      setHighlightedIndex(-1);
    } else {
      setShowAutocomplete(false);
      setFilteredOptions([]);
    }
  }, [options]);

  const handleSelect = useCallback((selectedOption, onSelect) => {
    if (onSelect) onSelect(selectedOption);
    setShowAutocomplete(false);
    setFilteredOptions([]);
  }, []);

  const handleKeyDown = useCallback((e, onSelect) => {
    if (!showAutocomplete) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          e.preventDefault();
          handleSelect(filteredOptions[highlightedIndex], onSelect);
        } else {
          setShowAutocomplete(false);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        break;
      default:
        break;
    }
  }, [showAutocomplete, highlightedIndex, filteredOptions, handleSelect]);

  const closeAutocomplete = useCallback(() => {
    setShowAutocomplete(false);
  }, []);

  const openAutocomplete = useCallback(() => {
    if (filteredOptions.length > 0) {
      setShowAutocomplete(true);
    }
  }, [filteredOptions]);

  return {
    showAutocomplete,
    filteredOptions,
    highlightedIndex,
    handleInputChange,
    handleSelect,
    handleKeyDown,
    closeAutocomplete,
    openAutocomplete,
  };
};
