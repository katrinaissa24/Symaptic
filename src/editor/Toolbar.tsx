import { memo } from 'react';
import { CircleHelp, Hand, ListTree, MessageSquare, MousePointer2, Plus } from 'lucide-react';
import { IconButton } from '../components/ui';
import { useUIStore } from './uiStore';

export const Toolbar = memo(function Toolbar({
  canEdit,
  canComment,
  onIdea,
  onComment,
  onTidy,
  onHelp,
}: {
  canEdit: boolean;
  canComment: boolean;
  onIdea(): void;
  onComment(): void;
  onTidy(): void;
  onHelp(): void;
}) {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  return (
    <div className="toolbar" role="toolbar" aria-label="Tools">
      <IconButton label="Select" shortcut="V" size="lg" tooltipSide="top" active={tool === 'select'} aria-pressed={tool === 'select'} onClick={() => setTool('select')}>
        <MousePointer2 />
      </IconButton>
      <IconButton label="Hand" shortcut="H" size="lg" tooltipSide="top" active={tool === 'hand'} aria-pressed={tool === 'hand'} onClick={() => setTool('hand')}>
        <Hand />
      </IconButton>
      {(canEdit || canComment) && <span className="toolbar-divider" aria-hidden />}
      {canEdit && (
        <IconButton label="Idea" shortcut="N" size="lg" tooltipSide="top" onClick={onIdea}>
          <Plus />
        </IconButton>
      )}
      {canComment && (
        <IconButton label="Comment" shortcut="C" size="lg" tooltipSide="top" onClick={onComment}>
          <MessageSquare />
        </IconButton>
      )}
      {canEdit && (
        <>
          <span className="toolbar-divider" aria-hidden />
          <IconButton label="Tidy layout" shortcut="T" size="lg" tooltipSide="top" onClick={onTidy}>
            <ListTree />
          </IconButton>
        </>
      )}
      <span className="toolbar-divider" aria-hidden />
      <IconButton label="Shortcuts" shortcut="?" size="lg" tooltipSide="top" onClick={onHelp}>
        <CircleHelp />
      </IconButton>
    </div>
  );
});
