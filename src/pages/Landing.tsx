import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { store } from '../lib/store';
import { LogoMark } from '../components/Logo';
import { BRANCH_COLORS, shade } from '../lib/palette';
import { cubicFor, cloudPath, taperedPath } from '../editor/geometry';
import { ShapeIcon } from '../editor/icons';
import type { Shape } from '../lib/types';

interface HNode {
  id: number;
  x: number;
  y: number;
  label: string;
  color: string;
  parent: number | null;
}

const W = 1000;
const H = 460;
const WORDS = ['Dream', 'Sketch', 'Wonder', 'Plan', 'Ask why', 'Play', 'Remix', 'Explore', 'Build', 'Notice', 'Riff', 'Bloom', 'Doodle', 'Gather'];

const START: HNode[] = [
  { id: 0, x: 500, y: 230, label: 'Your big idea', color: '#c58ae0', parent: null },
  { id: 1, x: 240, y: 110, label: 'Curious', color: '#3cc9b0', parent: 0 },
  { id: 2, x: 220, y: 330, label: 'Calm', color: '#6f96dc', parent: 0 },
  { id: 3, x: 770, y: 100, label: 'Brave', color: '#f2c94c', parent: 0 },
  { id: 4, x: 790, y: 250, label: 'Surprised', color: '#e8606e', parent: 0 },
  { id: 5, x: 740, y: 380, label: 'Joyful', color: '#f29a55', parent: 0 },
  { id: 6, x: 70, y: 60, label: 'Inquisitive', color: '#3cc9b0', parent: 1 },
  { id: 7, x: 60, y: 160, label: 'Engaged', color: '#3cc9b0', parent: 1 },
  { id: 8, x: 60, y: 400, label: 'Peaceful', color: '#6f96dc', parent: 2 },
  { id: 9, x: 930, y: 205, label: 'Amazed', color: '#e8606e', parent: 4 },
  { id: 10, x: 935, y: 300, label: 'Eager', color: '#e8606e', parent: 4 },
];

const ROOT_W = 190;
const ROOT_H = 54;

function branch(a: HNode, b: HNode, depth: number) {
  const right = b.x >= a.x;
  const sx = a.parent === null ? a.x + (right ? ROOT_W / 2 : -ROOT_W / 2) : a.x + (right ? 45 : -45);
  const start = { x: sx, y: a.y + (a.parent === null ? 0 : 6) };
  const end = { x: b.x + (right ? -45 : 45), y: b.y + 6 };
  return taperedPath(cubicFor(start, end, true), depth === 0 ? 14 : 7);
}

function HeroMap() {
  const [nodes, setNodes] = useState(START);
  const [drag, setDrag] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const off = useRef({ dx: 0, dy: 0 });

  const toSvg = (e: React.PointerEvent) => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };

  const sprout = () => {
    setNodes((ns) => {
      const id = ns.length ? Math.max(...ns.map((n) => n.id)) + 1 : 0;
      const parents = ns.filter((n) => n.parent === 0);
      const p = parents[Math.floor(Math.random() * parents.length)];
      const dir = p.x >= 500 ? 1 : -1;
      const x = Math.min(W - 70, Math.max(70, p.x + dir * (110 + Math.random() * 60)));
      const y = Math.min(H - 30, Math.max(30, p.y + (Math.random() - 0.5) * 170));
      return [...ns, { id, x, y, label: WORDS[id % WORDS.length], color: p.color, parent: p.id }];
    });
  };

  const depth = (n: HNode) => (n.parent === 0 ? 0 : 1);
  const comment = nodes.find((n) => n.id === 3)!;
  const cloud = { x: comment.x - 150, y: comment.y - 95 };

  return (
    <div className="hero-map">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={(e) => {
          if (drag == null) return;
          const p = toSvg(e);
          setNodes((ns) => ns.map((n) => (n.id === drag ? { ...n, x: p.x - off.current.dx, y: p.y - off.current.dy } : n)));
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <g className="hero-branches">
          {nodes.map((n) => {
            const p = n.parent != null ? nodes.find((x) => x.id === n.parent) : null;
            return p ? <path key={n.id} d={branch(p, n, depth(n))} fill={n.color} className="sway" style={{ ['--d' as string]: `${(n.id % 5) * 0.4}s` }} /> : null;
          })}
        </g>

        {/* a thought-bubble comment */}
        <g className="hero-thought" transform={`translate(${cloud.x},${cloud.y})`}>
          <ellipse cx={128} cy={72} rx={5} ry={4} />
          <ellipse cx={140} cy={82} rx={3.5} ry={3} />
          <g transform="scale(1.2,0.62)">
            <path d={cloudPath(10)} />
          </g>
          <text x={60} y={30} textAnchor="middle">love this! 💭</text>
        </g>

        {nodes.map((n) => {
          const root = n.parent === null;
          const start = (e: React.PointerEvent) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            const p = toSvg(e);
            off.current = { dx: p.x - n.x, dy: p.y - n.y };
            setDrag(n.id);
          };
          return root ? (
            <g key={n.id} className="hero-node root" onPointerDown={start}>
              <rect x={n.x - ROOT_W / 2} y={n.y - ROOT_H / 2} width={ROOT_W} height={ROOT_H} rx={16} fill={n.color} />
              <text x={n.x} y={n.y + 7} textAnchor="middle">{n.label}</text>
            </g>
          ) : (
            <g key={n.id} className={`hero-node ${depth(n) === 0 ? 'main' : ''}`} onPointerDown={start}>
              <rect x={n.x - 50} y={n.y - 18} width={100} height={28} fill="transparent" />
              <text x={n.x} y={n.y} textAnchor="middle" fill={depth(n) === 0 ? shade(n.color, 0.35) : '#5d5468'}>
                {n.label}
              </text>
            </g>
          );
        })}

        <g className="hero-plus" onClick={sprout} transform={`translate(${nodes[0].x + ROOT_W / 2 + 4},${nodes[0].y - ROOT_H / 2 - 4})`}>
          <circle r={15} />
          <path d="M-6 0h12M0 -6v12" />
        </g>
      </svg>
      <p className="hero-tip">↑ go on, drag the ideas around or press the <b>+</b></p>
    </div>
  );
}

const SHAPES: Shape[] = ['pill', 'cloud', 'hexagon', 'diamond', 'circle', 'underline'];

const TICKER: [string, string][] = [
  ['Right-click for the colour wheel', '#e8606e'],
  ['Drag a + to sprout an idea', '#3cc9b0'],
  ['Tab grows a branch', '#f2c94c'],
  ['Thought-bubble comments', '#f29a55'],
  ['Share with a link', '#6f96dc'],
  ['Guests welcome', '#c58ae0'],
  ['Ten node shapes', '#86c440'],
  ['Tidy in one click', '#ef7fb0'],
  ['Live collaboration', '#4fb3d9'],
  ['Undo anything', '#9b7be6'],
];

// Tapered branches that grow down into the footer.
const FOOT_BRANCHES: [string, string][] = [
  [taperedPath(cubicFor({ x: 600, y: 120 }, { x: 80, y: 18 }, true), 16), '#3cc9b0'],
  [taperedPath(cubicFor({ x: 600, y: 120 }, { x: 330, y: 50 }, true), 12), '#f2c94c'],
  [taperedPath(cubicFor({ x: 600, y: 120 }, { x: 870, y: 40 }, true), 12), '#e8606e'],
  [taperedPath(cubicFor({ x: 600, y: 120 }, { x: 1130, y: 12 }, true), 16), '#6f96dc'],
  [taperedPath(cubicFor({ x: 600, y: 120 }, { x: 560, y: 70 }, false), 9), '#c58ae0'],
];

export default function Landing() {
  const { user, ensureUser } = useAuth();
  const nav = useNavigate();
  const [shapeIdx, setShapeIdx] = useState(0);
  const [starting, setStarting] = useState(false);

  // No sign-up wall: become a guest if needed and land straight in a fresh map.
  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const u = await ensureUser();
      nav(`/d/${await store.create(u, 'Untitled map')}`);
    } catch {
      nav('/login');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="landing">
      <nav className="land-nav">
        <Logo />
        <div className="spacer" />
        {user ? <Link className="btn ghost" to="/app">My maps</Link> : <Link className="btn ghost" to="/login">Sign in</Link>}
      </nav>

      <section className="hero">
        <h1>
          Let your thoughts <span className="grow">branch out</span>.
        </h1>
        <p className="lede">A colourful mind map you can shape, comment on, and share with anyone in two clicks.</p>
        <div className="hero-ctas">
          <button className="btn primary big" onClick={start} disabled={starting}>
            {starting ? 'Planting your map…' : 'Start mapping. It’s free'}
          </button>
        </div>
        <p className="hero-note">No sign-up needed. Jump in as a guest and save your maps later.</p>
        <HeroMap />
      </section>

      <section className="palette-strip" aria-label="Colour palette">
        {BRANCH_COLORS.map((c, i) => (
          <span key={c} style={{ background: c, ['--i' as string]: i }} />
        ))}
      </section>

      <section className="features">
        <article className="feature" onMouseEnter={() => setShapeIdx((i) => i + 1)}>
          <div className="feature-art shapes" style={{ color: BRANCH_COLORS[shapeIdx % BRANCH_COLORS.length] }}>
            {SHAPES.map((s, i) => (
              <span key={s} className={i === shapeIdx % SHAPES.length ? 'on' : ''}>
                <ShapeIcon shape={s} size={34} />
              </span>
            ))}
          </div>
          <h3>Shape every idea</h3>
          <p>Ten shapes, a painter’s colour wheel, tapered branches, any thickness. Right-click anything for the wheel.</p>
        </article>
        <article className="feature">
          <div className="feature-art thought-demo">
            <div className="mini-node">Launch plan</div>
            <i /><i /><i />
            <div className="mini-cloud">what about May? 🤔</div>
          </div>
          <h3>Comments that float</h3>
          <p>Feedback drifts off an idea as a thought bubble, so you’ll never mistake it for part of the map.</p>
        </article>
        <article className="feature">
          <div className="feature-art share-demo">
            {[['A', 'Can edit', '#3cc9b0'], ['M', 'Can comment', '#f29a55'], ['J', 'Can view', '#6f96dc']].map(([a, r, c]) => (
              <div key={a} className="share-pill">
                <span className="avatar" style={{ background: c }}>{a}</span>
                {r}
              </div>
            ))}
          </div>
          <h3>Share like a doc</h3>
          <p>Invite by email or copy a link. You decide who views, comments or edits, and changes show up live.</p>
        </article>
      </section>

      <section className="ticker" aria-label="Things you can do">
        <div className="ticker-track">
          {[0, 1].map((k) => (
            <div className="ticker-row" key={k} aria-hidden={k === 1}>
              {TICKER.map(([label, c]) => (
                <span className="ticker-chip" key={label}>
                  <i style={{ background: c }} />
                  {label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <h2>Your next idea is one click away.</h2>
        <button className="btn primary big" onClick={start} disabled={starting}>Open a blank map</button>
      </section>

      <footer className="land-foot">
        <svg className="foot-branches" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
          {FOOT_BRANCHES.map(([d, c], i) => (
            <path key={i} d={d} fill={c} />
          ))}
        </svg>
        <div className="foot-inner">
          <div className="foot-brand">
            <div className="foot-word">
              <LogoMark size={40} />
              <span>symaptic</span>
            </div>
            <p>A colourful place for messy, wonderful thinking. Map it, shape it, share it.</p>
            <button className="btn primary" onClick={start} disabled={starting}>Start a map →</button>
          </div>
          <nav className="foot-col">
            <h4>Product</h4>
            <button onClick={start}>New map</button>
            <Link to="/app">My maps</Link>
            <Link to="/login">Sign in</Link>
          </nav>
          <div className="foot-col">
            <h4>Handy keys</h4>
            <span><kbd>Right-click</kbd> the wheel</span>
            <span><kbd>Tab</kbd> new branch</span>
            <span><kbd>Enter</kbd> sibling</span>
            <span><kbd>⌘ Z</kbd> undo</span>
          </div>
          <div className="foot-col">
            <h4>Open source</h4>
            <a href="https://github.com/katrinaissa24/Symaptic" target="_blank" rel="noreferrer">GitHub</a>
            <span className="muted-foot">Built with React Flow &amp; Firebase</span>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Symaptic</span>
          <span className="foot-dots">
            {BRANCH_COLORS.slice(0, 7).map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
          <span>Made with curiosity 💭</span>
        </div>
      </footer>
    </div>
  );
}
