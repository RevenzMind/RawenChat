"use client";

import { useEffect } from "react";

const SCRIPT_ID = "tw-runtime";
// Use the Play CDN — designed for browser use, suppresses the production warning
const CDN_SRC = "https://cdn.tailwindcss.com/3.4.1";

declare global {
  interface Window {
    tailwind?: {
      config: Record<string, unknown>;
    };
  }
}

export function TailwindRuntimeLoader() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID) || window.tailwind) return;

    // Set config before script loads so Tailwind picks it up immediately
    window.tailwind = {
      config: {
        // Disable preflight so it doesn't override global styles
        corePlugins: { preflight: false },
        // No purging in runtime mode — all classes available
      },
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = CDN_SRC;
    document.head.appendChild(script);
  }, []);

  return null;
}
