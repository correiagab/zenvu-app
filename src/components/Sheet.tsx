import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  full?: boolean;
  headerEnd?: ReactNode;
}

let openCount = 0;

/** Bottom sheet. Locks page scroll while open and closes on swipe-down of the handle/header. */
export function Sheet({ open, onClose, title, children, full, headerEnd }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    openCount++;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (--openCount === 0) document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const start = (e: React.TouchEvent) => { drag.current = { y: e.touches[0].clientY, dy: 0 }; };
  const move = (e: React.TouchEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.transform = `translate(-50%, ${dy}px)`;
  };
  const end = () => {
    if (!drag.current || !sheetRef.current) return;
    const { dy } = drag.current;
    drag.current = null;
    sheetRef.current.style.transition = 'transform 0.2s';
    if (dy > 110) onClose();
    else sheetRef.current.style.transform = 'translate(-50%, 0)';
  };

  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div ref={sheetRef} className={`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true">
        <div onTouchStart={start} onTouchMove={move} onTouchEnd={end}>
          <div className="grab" />
          {(title || headerEnd) && (
            <div className="sheet-head">
              <h2>{title}</h2>
              {headerEnd}
              <button className="icon-btn" onClick={onClose} aria-label="Fechar" style={{ width: 32, height: 32, background: 'var(--card-2)' }}>
                <X size={18} />
              </button>
            </div>
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>,
    document.body,
  );
}
