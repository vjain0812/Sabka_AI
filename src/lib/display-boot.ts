/** Shared by the root layout (server) and the display store (client). */
export const DISPLAY_KEY = 'sabka-ai:display:v1';
/** Runs before React to avoid a flash of small text. Keep in sync with apply() in display.ts. */
export const DISPLAY_BOOT = `(function(){try{var d=JSON.parse(localStorage.getItem('${DISPLAY_KEY}')||'{}'),r=document.documentElement;r.dataset.text=d.largeText?'large':'normal';r.dataset.contrast=d.highContrast?'high':'normal';r.dataset.motion=d.calmMotion?'reduce':'normal'}catch(e){}})()`;
