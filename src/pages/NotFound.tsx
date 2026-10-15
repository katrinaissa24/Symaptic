import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '../components/ui';
import { Logo } from '../components/Logo';
import { usePageTitle } from '../lib/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <main className="error-page page-enter">
      <div className="error-card">
        <Logo />
        <Compass />
        <h2>There’s nothing here</h2>
        <p>The page you’re looking for doesn’t exist or has moved.</p>
        <div className="error-actions">
          <Button variant="primary" asChild>
            <Link to="/app">My maps</Link>
          </Button>
          <Button asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
