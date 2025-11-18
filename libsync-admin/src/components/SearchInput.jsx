import React, { useState, useEffect, useRef } from 'react';

const SearchInput = ({ 
  placeholder = "Search...", 
  onSearch, 
  suggestions = [], 
  onSuggestionSelect,
  value = "",
  onChange,
  onBlur,
  style = {},
  renderSuggestion
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange && onChange(newValue);
    onSearch && onSearch(newValue);
    // Open suggestions if there are any and value is not empty
    setIsOpen(suggestions.length > 0 && newValue.length > 0);
    setHighlightedIndex(-1);
  };

  // Update isOpen when suggestions change
  useEffect(() => {
    if (suggestions.length > 0 && value.length > 0) {
      setIsOpen(true);
    }
  }, [suggestions, value]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSuggestionSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    onSuggestionSelect && onSuggestionSelect(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={wrapperRef} style={{ ...styles.wrapper, ...style }}>
      <div style={styles.inputContainer}>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && value.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={onBlur}
          style={styles.input}
        />
        <div style={styles.searchIcon}>🔍</div>
      </div>
      
      {isOpen && suggestions.length > 0 && (
        <div style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              style={{
                ...styles.suggestion,
                ...(index === highlightedIndex && styles.highlightedSuggestion)
              }}
              onMouseDown={(e) => {
                // Use onMouseDown instead of onClick to prevent blur from closing dropdown
                e.preventDefault();
                handleSuggestionSelect(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {renderSuggestion ? renderSuggestion(suggestion) : (
                suggestion.label || suggestion.name || suggestion.email || suggestion.title || 
                (suggestion.accessionNumber ? `${suggestion.accessionNumber} - ${suggestion.title}` : '')
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    position: 'relative',
    width: '100%'
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    fontSize: '16px',
    color: '#94a3b8',
    pointerEvents: 'none'
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    maxHeight: '200px',
    overflowY: 'auto',
    marginTop: '4px'
  },
  suggestion: {
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: '#f8fafc'
    }
  },
  highlightedSuggestion: {
    backgroundColor: '#f1f5f9',
    color: '#1e293b'
  }
};

export default SearchInput;
