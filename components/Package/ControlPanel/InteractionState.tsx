
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { MetaButtonProps } from '../../../types/index.tsx';
import Select from '../../Core/Select.tsx';

interface InteractionStatePanelProps {
  btnProps: MetaButtonProps;
  onPropChange: (keyOrObj: string | Partial<MetaButtonProps>, value?: any) => void;
}

export const InteractionState: React.FC<InteractionStatePanelProps> = ({ btnProps, onPropChange }) => {
  const currentInteraction = btnProps.disabled ? 'disabled'
    : btnProps.forcedActive ? 'active'
    : btnProps.forcedFocus ? 'focus'
    : btnProps.forcedHover ? 'hover'
    : 'default';

  const handleInteractionChange = (e: any) => {
    const val = e.target.value;
    const updates: Partial<MetaButtonProps> = {
      disabled: false,
      forcedHover: false,
      forcedFocus: false,
      forcedActive: false,
    };
    if (val !== 'default') {
      if (val === 'disabled') updates.disabled = true;
      else if (val === 'hover') updates.forcedHover = true;
      else if (val === 'focus') updates.forcedFocus = true;
      else if (val === 'active') updates.forcedActive = true;
    }
    onPropChange(updates);
  };

  return (
    <div style={{ width: '100%' }}>
      <Select
        label="Interaction State"
        value={currentInteraction}
        onChange={handleInteractionChange}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'hover', label: 'Hover' },
          { value: 'focus', label: 'Focus' },
          { value: 'active', label: 'Click' },
          { value: 'disabled', label: 'Disabled' },
        ]}
      />
    </div>
  );
};
