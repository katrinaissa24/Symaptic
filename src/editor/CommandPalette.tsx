import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Dialog, Kbd } from '../components/ui';

export interface Command {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string;
  disabled?: boolean;
  run(): void;
}

function score(q: string, c: Command): number {
  const hay = `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase();
  if (!q) return 1;
  if (c.label.toLowerCase().startsWith(q)) return 3;
  if (hay.includes(q)) return 2;
  // subsequence match ("tdy" → "tidy")
  let i = 0;
  for (const ch of hay) if (ch === q[i]) i++;
  return i === q.length ? 1 : 0;
}

export function CommandPalette({ open, onOpenChange, commands }: { open: boolean; onOpenChange(o: boolean): void; commands: Command[] }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const query = q.trim().toLowerCase();
  const items = useMemo(
    () =>
      commands
        .filter((c) => !c.disabled)
        .map((c) => ({ c, s: score(query, c) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.c),
    [commands, query],
  );
  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (c: Command) => {
    onOpenChange(false);
    setTimeout(c.run, 0);
  };

  let lastGroup = '';
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Command palette" hideTitle width={560} sheet={false} className="dialog-palette">
      <div className="palette">
        <div className="palette-input">
          <Search />
          <input
            autoFocus
            value={q}
            placeholder="Type a command…"
            aria-label="Search commands"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
            role="combobox"
            aria-expanded
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter' && items[active]) {
                e.preventDefault();
                run(items[active]);
              }
            }}
          />
        </div>
        <div className="palette-list" role="listbox" id="palette-list" ref={list}>
          {items.length === 0 && <div className="palette-empty">No matching commands</div>}
          {items.map((c, i) => {
            const head = c.group !== lastGroup && !query ? <div className="palette-group">{c.group}</div> : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {head}
                <div
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  className={`palette-item${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                >
                  <span className="palette-icon">{c.icon}</span>
                  <span className="palette-label">{c.label}</span>
                  {query && <span className="palette-meta">{c.group}</span>}
                  {c.shortcut && <Kbd keys={c.shortcut} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
