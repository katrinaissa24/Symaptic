import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TooltipProvider } from './components/ui/Tooltip';
import { applyTheme } from './lib/theme';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/editor.css';
import './styles/chrome.css';
import './index.css';

applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
