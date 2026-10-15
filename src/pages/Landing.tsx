import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Keyboard, MessageSquare, Share2, Sparkles } from 'lucide-react';
import { Logo, LogoMark } from '../components/Logo';
import { MapThumb } from '../components/MapThumb';
import { Button, Kbd } from '../components/ui';
import { useAuth } from '../lib/auth';
import { store } from '../lib/store';
import { TEMPLATES } from '../lib/templates';
import { usePageTitle } from '../lib/usePageTitle';

const PREVIEW = TEMPLATES[2].build();

export default function Landing() {
  usePageTitle(undefined);
  const { user, ensureUser } = useAuth();
  const nav = useNavigate();
  const [starting, setStarting] = useState(false);

  // No sign-up wall: become a guest if needed and land straight in a fresh map.
  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const u = await ensureUser();
      nav(`/d/${store.createOptimistic(u, 'Untitled map').id}`);
    } catch {
      nav('/login');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="landing page-enter">
      <nav className="land-nav" aria-label="Main">
        <Logo />
        <div className="spacer" />
        <Button variant="ghost" asChild>
          {user ? <Link to="/app">My maps</Link> : <Link to="/login">Sign in</Link>}
        </Button>
        <Button variant="primary" onClick={start} disabled={starting}>
          {starting ? 'Opening…' : 'New map'}
        </Button>
      </nav>

      <main>
        <section className="hero">
          <h1>Mind maps your team will actually read.</h1>
          <p className="lede">A calm, fast canvas for branching ideas. Share a link, comment in place, and keep every map in one tidy library.</p>
          <div className="hero-ctas">
            <Button variant="primary" size="lg" icon={<ArrowRight />} onClick={start} disabled={starting}>
              {starting ? 'Opening…' : 'Start a map'}
            </Button>
            <Button size="lg" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <p className="hero-note">No account needed to try it. Sign in later to keep your maps.</p>
          <div className="hero-preview" role="img" aria-label="Example map: a project plan">
            <div className="hero-preview-bar" aria-hidden>
              <span className="hero-dot" />
              <span className="hero-dot" />
              <span className="hero-dot" />
              <span className="hero-preview-title">Project plan</span>
            </div>
            <MapThumb doc={PREVIEW} className="hero-thumb" />
          </div>
        </section>

        <section className="features" aria-label="What you get">
          <article className="feature">
            <Keyboard />
            <h2>Fast from the keyboard</h2>
            <p>
              <Kbd keys="Tab" /> adds a child, <Kbd keys="Enter" /> a sibling. Tidy the whole map in one keystroke and undo anything.
            </p>
          </article>
          <article className="feature">
            <MessageSquare />
            <h2>Comments in context</h2>
            <p>Leave a note on any idea, reply in a thread and resolve it when it’s done. Nothing gets lost in chat.</p>
          </article>
          <article className="feature">
            <Share2 />
            <h2>Share like a document</h2>
            <p>Invite by email or share a link. You decide who views, comments or edits, and changes show up live.</p>
          </article>
          <article className="feature">
            <Sparkles />
            <h2>Templates to start from</h2>
            <p>Blank canvas, brainstorm or project plan. Every map opens instantly and works offline-tolerant.</p>
          </article>
        </section>

        <section className="final-cta">
          <h2>Your next idea is one click away.</h2>
          <Button variant="primary" size="lg" onClick={start} disabled={starting}>
            Open a blank map
          </Button>
        </section>
      </main>

      <footer className="land-foot">
        <div className="foot-brand">
          <LogoMark size={20} />
          <span>Symaptic</span>
        </div>
        <nav className="foot-links" aria-label="Footer">
          <Link to="/app">My maps</Link>
          <Link to="/login">Sign in</Link>
          <a href="https://github.com/katrinaissa24/Symaptic" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <span className="muted text-xs">© {new Date().getFullYear()} Symaptic</span>
      </footer>
    </div>
  );
}
