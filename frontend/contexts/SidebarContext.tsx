'use client';

import { createContext, useContext } from 'react';

interface SidebarContextValue {
  onToggleSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  onToggleSidebar: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}
