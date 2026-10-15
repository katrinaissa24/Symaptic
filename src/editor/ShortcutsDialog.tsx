import { Dialog, Kbd } from '../components/ui';

const GROUPS: [string, [string, string][]][] = [
  [
    'General',
    [
      ['Command palette', 'Mod+K'],
      ['Shortcuts', '?'],
      ['Undo', 'Mod+Z'],
      ['Redo', 'Mod+Shift+Z'],
      ['Deselect / cancel', 'Esc'],
    ],
  ],
  [
    'Ideas',
    [
      ['Add child idea', 'Tab'],
      ['Add sibling idea', 'Enter'],
      ['Edit text', 'F2'],
      ['Finish editing', 'Mod+Enter'],
      ['New line while editing', 'Shift+Enter'],
      ['Delete selection', 'Delete'],
      ['Duplicate', 'Mod+D'],
      ['Copy / cut / paste', 'Mod+C'],
      ['Select all', 'Mod+A'],
      ['Move selection between ideas', '← ↑ ↓ →'],
      ['Move an idea without its branch', 'Alt+drag'],
    ],
  ],
  [
    'Canvas',
    [
      ['New idea', 'N'],
      ['Comment on selection', 'C'],
      ['Tidy layout', 'T'],
      ['Select tool / Hand tool', 'V'],
      ['Pan', 'Space+drag'],
      ['Select many', 'drag'],
      ['Zoom', 'scroll'],
      ['Zoom in / out', 'Mod+='],
      ['Fit to screen', 'Shift+1'],
      ['Zoom to 100%', 'Shift+0'],
    ],
  ],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange(o: boolean): void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts" width={640}>
      <div className="shortcut-groups">
        {GROUPS.map(([name, rows]) => (
          <section key={name} className="shortcut-group">
            <h4>{name}</h4>
            <dl>
              {rows.map(([label, keys]) => (
                <div key={label} className="shortcut-row">
                  <dt>{label}</dt>
                  <dd>{keys.includes(' ') && !keys.includes('+') ? <span className="muted text-xs">{keys}</span> : <Kbd keys={keys} />}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
