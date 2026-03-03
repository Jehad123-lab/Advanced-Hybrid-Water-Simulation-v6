/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

const Portal: React.FC<PortalProps> = ({ children }) => {
  const portalRootRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    portalRootRef.current = document.getElementById('portal-root');
    if (!portalRootRef.current) {
      const newRoot = document.createElement('div');
      newRoot.id = 'portal-root';
      // Style the root to not interfere with layout
      newRoot.style.position = 'absolute';
      newRoot.style.top = '0';
      newRoot.style.left = '0';
      newRoot.style.zIndex = '1000'; // Ensure it's on top
      document.body.appendChild(newRoot);
      portalRootRef.current = newRoot;
    }
    setMounted(true);

  }, []);

  if (!mounted || !portalRootRef.current) {
    return null;
  }

  return createPortal(children, portalRootRef.current);
};

export default Portal;
