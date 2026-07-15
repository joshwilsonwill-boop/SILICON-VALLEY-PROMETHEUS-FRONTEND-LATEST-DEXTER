"use client";

import { useCallback } from "react";

export function useCopyToClipboard() {
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { copy };
}
