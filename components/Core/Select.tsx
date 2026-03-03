/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import Portal from './Portal.tsx';

interface SelectProps {
  label: string;
  value: string;
  onChange: (e: any) => void; // Using any to simulate event payload
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}

const Select: React.FC<SelectProps> = ({ label, value, onChange, options, style }) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Find label for current value
  const currentLabel = options.find(opt => opt.value === value)?.label || value;

  const handleSelect = (newValue: string) => {
    // Simulate a change event
    onChange({ target: { value: newValue } });
    setIsOpen(false);
  };

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    padding: theme.spacing['Space.S'],
    borderRadius: theme.radius['Radius.S'],
    border: `1px solid ${isOpen ? theme.Color.Focus.Content[1] : theme.Color.Base.Surface[3]}`,
    backgroundColor: theme.Color.Base.Surface[2],
    color: theme.Color.Base.Content[1],
    fontFamily: theme.Type.Readable.Body.M.fontFamily,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    outline: 'none',
    transition: `border-color ${theme.time['Time.2x']} ease`,
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${dropdownPosition.top}px`,
    left: `${dropdownPosition.left}px`,
    width: `${dropdownPosition.width}px`,
    marginTop: theme.spacing['Space.XS'],
    backgroundColor: theme.Color.Base.Surface[2],
    border: `1px solid ${theme.Color.Base.Surface[3]}`,
    borderRadius: theme.radius['Radius.S'],
    boxShadow: theme.effects['Effect.Shadow.Drop.2'],
    zIndex: 100,
    overflow: 'hidden',
    padding: theme.spacing['Space.XS'],
  };

  return (
    <div style={{ position: 'relative' }} onPointerDown={(e) => e.stopPropagation()}>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.S'], color: theme.Color.Base.Content[2] }}>
        {label}
      </label>
      
      {/* Trigger Button */}
      <motion.button
        ref={triggerRef}
        style={triggerStyle}
        onClick={() => setIsOpen(!isOpen)}
        {...({
          whileTap: { scale: 0.98 }
        } as any)}
        type="button"
      >
        <span>{currentLabel}</span>
        <motion.i 
            className="ph-bold ph-caret-down" 
            {...({
              animate: { rotate: isOpen ? 180 : 0 }
            } as any)}
        />
      </motion.button>

      {/* Backdrop for click outside */}
      {isOpen && (
        <div 
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99, cursor: 'default' }} 
            onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <Portal>
            <motion.div
              style={dropdownStyle}
              {...({
                initial: { opacity: 0, y: -10, scaleY: 0.9 },
                animate: { opacity: 1, y: 0, scaleY: 1 },
                exit: { opacity: 0, y: -10, scaleY: 0.9 },
                transition: { duration: 0.15 }
              } as any)}
            >
              {options.map((option, index) => (
                <motion.div
                  key={`${option.value}-${index}`}
                  onClick={() => handleSelect(option.value)}
                  style={{
                    padding: `${theme.spacing['Space.S']} ${theme.spacing['Space.M']}`,
                    cursor: 'pointer',
                    borderRadius: theme.radius['Radius.S'],
                    color: option.value === value ? theme.Color.Accent.Content[1] : theme.Color.Base.Content[1],
                    backgroundColor: option.value === value ? theme.Color.Accent.Surface[1] : 'rgba(0, 0, 0, 0)',
                    fontFamily: theme.Type.Readable.Body.M.fontFamily,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2px'
                  }}
                  {...({
                    whileHover: { 
                        backgroundColor: option.value === value ? theme.Color.Accent.Surface[1] : theme.Color.Base.Surface[3] 
                    }
                  } as any)}
                >
                  {option.label}
                  {option.value === value && <i className="ph-bold ph-check" />}
                </motion.div>
              ))}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Select;