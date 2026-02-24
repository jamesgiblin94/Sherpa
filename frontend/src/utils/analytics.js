export function track(eventName, params = {}) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params)
    }
  } catch (e) {
    // Silently fail so analytics never breaks the app
  }
}
