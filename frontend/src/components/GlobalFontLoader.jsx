import React, { useEffect } from 'react';
import { useFonts } from '../hooks/useFonts';

export default function GlobalFontLoader() {
  const { headingFont, bodyFont } = useFonts();

  useEffect(() => {
    const styleId = 'global-dynamic-fonts';
    let styleEl = document.getElementById(styleId);

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const headingUrl = headingFont?.url;
    const bodyUrl = bodyFont?.url;
    const headingFamily = headingFont?.family || 'Montserrat Arabic';
    const bodyFamily = bodyFont?.family || 'Montserrat Arabic Light';

    let cssContent = '';

    // Only generate @font-face if URLs exist and differ from built-in defaults
    if (headingUrl && !headingUrl.startsWith('/fonts/')) {
      cssContent += `
        @font-face {
          font-family: '${headingFamily}';
          src: url('${headingUrl}') format('truetype');
          font-display: swap;
        }
      `;
    }

    if (bodyUrl && !bodyUrl.startsWith('/fonts/')) {
      cssContent += `
        @font-face {
          font-family: '${bodyFamily}';
          src: url('${bodyUrl}') format('truetype');
          font-display: swap;
        }
      `;
    }

    // Apply font families to CSS variables for dynamic overrides
    if (headingUrl || bodyUrl) {
      cssContent += `
        :root {
          --font-heading: '${headingFamily}', system-ui, sans-serif;
          --font-body: '${bodyFamily}', system-ui, sans-serif;
        }
      `;
    }

    styleEl.textContent = cssContent;
  }, [headingFont, bodyFont]);

  return null;
}
