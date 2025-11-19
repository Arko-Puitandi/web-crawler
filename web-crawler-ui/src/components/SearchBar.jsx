// src/components/SearchBar.jsx
import { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAutocomplete } from '../hooks/useAutocomplete';

export const SearchBar = ({ onSubmit, loading }) => {
  const { url, setUrl, allUrls, useMockData, filteredMockData, mockLocations, resetMockFilter } = useAppContext();
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  const {
    showAutocomplete,
    filteredOptions,
    highlightedIndex,
    handleInputChange,
    handleSelect,
    handleKeyDown: autocompleteKeyDown,
    closeAutocomplete,
    openAutocomplete,
  } = useAutocomplete(allUrls);

  const addTag = (value) => {
    const trimmedValue = value.trim();
    if (trimmedValue && !tags.includes(trimmedValue)) {
      const newTags = [...tags, trimmedValue];
      setTags(newTags);
      setUrl(newTags.join('\n'));
      setInputValue('');
      handleInputChange('');
      closeAutocomplete();
    }
  };

  const removeTag = (indexToRemove) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(newTags);
    setUrl(newTags.join('\n'));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    } else {
      autocompleteKeyDown(e, (selected) => {
        addTag(selected);
      });
    }
  };

  const handleInputChangeLocal = (e) => {
    const value = e.target.value;
    setInputValue(value);
    handleInputChange(value);
  };

  const handleSelectFromAutocomplete = (selected) => {
    addTag(selected);
    inputRef.current?.focus();
  };

  const showResetButton = useMockData && filteredMockData.length !== mockLocations.length;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Add current input value if exists
    if (inputValue.trim()) {
      addTag(inputValue);
    }
    // Wait a tick for state to update, then submit
    setTimeout(() => onSubmit(e), 10);
  };

  return (
    <form onSubmit={handleFormSubmit} className="search-form">
      <div className="search-input-wrapper">
        <div className="search-input-row">
          <div className="tag-input-container">
            {tags.map((tag, index) => (
              <div key={index} className="url-tag">
                <span className="tag-text">{tag}</span>
                <button
                  type="button"
                  className="tag-remove"
                  onClick={() => removeTag(index)}
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
            ))}
            <input
              ref={inputRef}
              type="text"
              placeholder={tags.length === 0 ? "Enter URLs and press Enter (or select from dropdown)" : "Add another URL..."}
              value={inputValue}
              onChange={handleInputChangeLocal}
              onKeyDown={handleKeyDown}
              onFocus={openAutocomplete}
              onBlur={() => setTimeout(closeAutocomplete, 200)}
              disabled={loading}
              className="tag-input"
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={loading || (tags.length === 0 && !inputValue.trim())} className="btn btn-primary btn-search">
            {loading ? '⏳ Loading...' : '🔍 Search'}
          </button>
        </div>
        {tags.length > 0 && (
          <div className="url-count-badge">
            {tags.length} URL{tags.length !== 1 ? 's' : ''} added
          </div>
        )}
        {showAutocomplete && inputValue && (
          <div className="autocomplete-dropdown">
            {filteredOptions.map((option, index) => (
              <div
                key={option}
                className={`autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                onClick={() => handleSelectFromAutocomplete(option)}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
      {(tags.length > 1 || showResetButton) && (
        <div className="search-actions">
          {tags.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setTags([]);
                setUrl('');
              }}
              disabled={loading}
              className="btn btn-clear-all"
            >
              Clear All
            </button>
          )}
          {showResetButton && (
            <button
              type="button"
              onClick={resetMockFilter}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              🔄 Reset Filter
            </button>
          )}
        </div>
      )}
    </form>
  );
};
