
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Update the state initially and on changes
    const handler = (): void => setMatches(mediaQuery.matches);
    
    // Add the event listener
    mediaQuery.addEventListener('change', handler);
    
    // Remove event listener on cleanup
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
