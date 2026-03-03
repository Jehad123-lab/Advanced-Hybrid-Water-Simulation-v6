/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

/**
 * 🧱 Floating Window Component
 * This component is now a pure presentational component for a draggable window.
 * Its mounting/unmounting (and thus its open/closed state and animations) are
 * controlled by AnimatePresence in its parent component.
 * It uses a React Portal to render into a separate DOM node, preventing layout shifts.
 */
interface FloatingWindowProps {
  title: string;
  zIndex: number;
  x: number;
  y: number;
  onClose: () => void;
  onFocus: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title,
  zIndex,
  x: initialX,
  y: initialY,
  onClose,
  onFocus,
  children,
  footer,
}) => {
  const { theme } = useTheme();
  const dragControls = useDragControls();
  
  // Initialize MotionValues with the position from props. Because this component
  // is now unmounted when closed, these will be correctly re-initialized each time.
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);

  const portalRoot = document.getElementById('portal-root');

  if (!portalRoot) {
    // Failsafe: If the portal root isn't available in the DOM, render nothing.
    // This prevents app crashes during edge cases like server-side rendering.
    return null;
  }

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    pointerEvents: 'auto',
    width: 'fit-content',
    height: 'fit-content',
  };

  const innerStyle: React.CSSProperties = {
    transform: 'translate(-50%, -50%)',
    width: '400px',
    height: 'auto',
    maxHeight: '600px',
    backgroundColor: `${theme.Color.Base.Surface[1]}dd`,
    backdropFilter: 'blur(20px)',
    borderRadius: theme.radius['Radius.L'],
    boxShadow: theme.effects['Effect.Shadow.Drop.3'],
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transformOrigin: 'center center',
  };

  const headerStyle: React.CSSProperties = {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${theme.spacing['Space.L']}`,
    borderBottom: `1px solid ${theme.Color.Base.Surface[2]}`,
    cursor: 'grab',
    userSelect: 'none',
    flexShrink: 0,
    touchAction: 'none',
  };

  const contentStyle: React.CSSProperties = {
    padding: theme.spacing['Space.L'],
    overflowY: 'auto',
    flex: 1,
    color: theme.Color.Base.Content[1],
    position: 'relative',
  };

  const footerStyle: React.CSSProperties = {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: `0 ${theme.spacing['Space.L']}`,
    borderTop: `1px solid ${theme.Color.Base.Surface[2]}`,
    cursor: 'grab',
    userSelect: 'none',
    backgroundColor: theme.Color.Base.Surface[2],
    flexShrink: 0,
    touchAction: 'none',
  };

  return createPortal(
    <motion.div
      style={{ ...wrapperStyle, x, y, zIndex } as any}
      {...({
        // The outer div handles dragging and a simple fade animation.
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        drag: true,
        dragListener: false,
        dragControls: dragControls,
        dragMomentum: false,
        onPointerDown: () => onFocus(),
        transition: { type: 'spring', damping: 25, stiffness: 250, duration: 0.2 },
      } as any)}
    >
      <div style={innerStyle}>
        <div
          style={headerStyle}
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
        >
            <span style={{ ...theme.Type.Readable.Label.M, color: theme.Color.Base.Content[1], letterSpacing: '0.05em' }}>
              {title.toUpperCase()}
            </span>
            <motion.button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: theme.Color.Error.Content[1],
                border: 'none',
                cursor: 'pointer',
                boxShadow: theme.effects['Effect.Shadow.Inset.1'],
              }}
              {...({
                whileHover: { scale: 1.2 },
                whileTap: { scale: 0.9 }
              } as any)}
              aria-label="Close"
              onPointerDown={(e) => e.stopPropagation()}
            />
        </div>
        
        <div
          style={contentStyle}
          onPointerDown={(e) => {
            e.stopPropagation(); 
          }}
        >
          {children}
        </div>

        <div
          style={footerStyle}
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
        >
          {footer || <div style={{ width: '100%', height: '4px', borderRadius: '2px', backgroundColor: theme.Color.Base.Surface[3] }} />}
        </div>
      </div>
    </motion.div>,
    portalRoot
  );
};

export default FloatingWindow;