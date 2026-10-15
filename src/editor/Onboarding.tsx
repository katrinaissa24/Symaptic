import { useState } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { Button, Kbd } from '../components/ui';

const KEY = 'symaptic:onboarded';

/** First-run tip above the toolbar. Dismissed once, remembered in localStorage. */
export function OnboardingTip({ canEdit }: { canEdit: boolean }) {
  const [shown, setShown] = useState(() => {
    try {
      return canEdit && !localStorage.getItem(KEY);
    } catch {
      return false;
    }
  });
  if (!shown) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setShown(false);
  };
  return (
    <div className="onboarding" role="dialog" aria-label="Getting started">
      <div className="onboarding-body">
        <strong>Welcome to your map</strong>
        <p>
          Select an idea and press <Kbd keys="Tab" /> for a child or <Kbd keys="Enter" /> for a sibling. Double-click to edit. Press <Kbd keys="?" /> for all
          shortcuts.
        </p>
      </div>
      <Button size="sm" variant="primary" onClick={dismiss}>
        Got it
      </Button>
    </div>
  );
}

/** Quiet prompt under a lone central idea. */
export function EmptyStateHint({ rootId }: { rootId: string }) {
  return (
    <NodeToolbar nodeId={rootId} isVisible position={Position.Bottom} offset={40} className="empty-hint">
      Select the idea and press <Kbd keys="Tab" /> to add your first branch
    </NodeToolbar>
  );
}
