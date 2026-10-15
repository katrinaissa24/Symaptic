const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Platform-aware modifier label: "Mod" becomes ⌘ on Mac and Ctrl elsewhere. */
export const modKey = IS_MAC ? '⌘' : 'Ctrl';
export const altKey = IS_MAC ? '⌥' : 'Alt';

/** Renders "Mod+Shift+Z" as a row of key caps. */
export function Kbd({ keys }: { keys: string }) {
  const parts = keys.split('+').map((k) => (k === 'Mod' ? modKey : k === 'Alt' ? altKey : k === 'Shift' ? (IS_MAC ? '⇧' : 'Shift') : k));
  return (
    <span className="kbd-group" aria-label={keys.replace(/Mod/g, IS_MAC ? 'Command' : 'Control')}>
      {parts.map((p, i) => (
        <kbd className="kbd" key={i}>
          {p}
        </kbd>
      ))}
    </span>
  );
}
