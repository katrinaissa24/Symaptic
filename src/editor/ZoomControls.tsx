import { perfCount } from '../lib/perf';
import { memo } from 'react';
import { useReactFlow, useStore, useStoreApi } from '@xyflow/react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { IconButton, Tooltip } from '../components/ui';
import { zoomTo } from './viewport';

/** "− 100% +" plus Fit, bottom-right. The percentage resets to 100% on click. */
export const ZoomControls = memo(function ZoomControls({ onFit }: { onFit(): void }) {
  perfCount('ZoomControls');
  const zoom = useStore((s) => s.transform[2]);
  const rf = useReactFlow();
  const store = useStoreApi();
  const size = () => ({ width: store.getState().width, height: store.getState().height });
  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <IconButton label="Zoom out" shortcut="Mod+-" size="sm" tooltipSide="top" onClick={() => zoomTo(rf, zoom / 1.2, size())}>
        <Minus />
      </IconButton>
      <Tooltip content="Reset to 100%" shortcut="Shift+0" side="top">
        <button type="button" className="zoom-value" onClick={() => zoomTo(rf, 1, size())} aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to 100 percent`}>
          {Math.round(zoom * 100)}%
        </button>
      </Tooltip>
      <IconButton label="Zoom in" shortcut="Mod+=" size="sm" tooltipSide="top" onClick={() => zoomTo(rf, zoom * 1.2, size())}>
        <Plus />
      </IconButton>
      <span className="zoom-divider" aria-hidden />
      <IconButton label="Fit to screen" shortcut="Shift+1" size="sm" tooltipSide="top" onClick={onFit}>
        <Maximize />
      </IconButton>
    </div>
  );
});
