import { useEffect } from 'react'

// The font question papers print in (it covers Hindi as well as English).
export const FONT_STACK = "'Noto Sans Devanagari', Arial, sans-serif"
export const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap'

// Loads the paper font once. A plain <link> (not a React-managed stylesheet), so a blocked
// Google Fonts request only falls back to Arial instead of breaking the page.
export function usePaperFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONT_HREF
    document.head.appendChild(link)
  }, [])
}
