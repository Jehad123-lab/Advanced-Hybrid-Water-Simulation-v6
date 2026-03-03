

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useTheme } from '../../../Theme.tsx';
import { MetaButtonProps } from '../../../types/index.tsx';
import Input from '../../Core/Input.tsx';
import Select from '../../Core/Select.tsx';
import RangeSlider from '../../Core/RangeSlider.tsx';
import ColorPicker from '../../Core/ColorPicker.tsx';

interface ElementPropsPanelProps {
  btnProps: MetaButtonProps;
  onPropChange: (keyOrObj: string | Partial<MetaButtonProps>, value?: any) => void;
  radiusMotionValue: any; 
  onRadiusCommit: (value: number) => void;
}

export const ElementProps: React.FC<ElementPropsPanelProps> = ({ btnProps, onPropChange, radiusMotionValue, onRadiusCommit }) => {
  const { theme, themeName } = useTheme();

  return (
    <>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.M'], color: theme.Color.Base.Content[2], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Element Props
      </label>
      <Input
        label="Label"
        value={btnProps.label}
        onChange={(e) => onPropChange('label', e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'], marginTop: theme.spacing['Space.L'] }}>
          <Select
            label="Variant"
            value={btnProps.variant}
            onChange={(e) => onPropChange('variant', e.target.value)}
            options={[
              { value: 'primary', label: 'Primary' },
              { value: 'secondary', label: 'Secondary' },
              { value: 'ghost', label: 'Ghost' },
              { value: 'outline', label: 'Outline' },
            ]}
          />
          <Select
            label="Size"
            value={btnProps.size}
            onChange={(e) => onPropChange('size', e.target.value)}
            options={[
              { value: 'S', label: 'Small (S)' },
              { value: 'M', label: 'Medium (M)' },
              { value: 'L', label: 'Large (L)' },
            ]}
          />
      </div>
      <div style={{ marginTop: theme.spacing['Space.L'] }}>
          <Select
            label="Icon (Phosphor)"
            value={btnProps.icon || ''}
            onChange={(e) => onPropChange('icon', e.target.value)}
            options={[
                { value: '', label: 'None' },
                { value: 'ph-sparkle', label: 'Sparkle' },
                { value: 'ph-heart', label: 'Heart' },
                { value: 'ph-bell', label: 'Bell' },
                { value: 'ph-rocket', label: 'Rocket' },
                { value: 'ph-gear', label: 'Gear' },
            ]}
          />
      </div>
      <div style={{ marginTop: theme.spacing['Space.L'] }}>
          <RangeSlider
            label="Corner Radius"
            motionValue={radiusMotionValue}
            onCommit={onRadiusCommit}
            min={0}
            max={56}
          />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'], marginTop: theme.spacing['Space.L'], width: '100%' }}>
        <ColorPicker
          label="Fill Color"
          value={btnProps.customFill || (themeName === 'dark' ? '#ffffff' : '#000000')}
          onChange={(e) => onPropChange('customFill', e.target.value)}
        />
        <ColorPicker
          label="Text Color"
          value={btnProps.customColor || (themeName === 'dark' ? '#000000' : '#ffffff')}
          onChange={(e) => onPropChange('customColor', e.target.value)}
        />
      </div>
    </>
  );
};