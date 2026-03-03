
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useTheme } from '../../../Theme.tsx';
import Toggle from '../../Core/Toggle.tsx';
import RangeSlider from '../../Core/RangeSlider.tsx';

interface InspectorPanelProps {
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
  showTokens: boolean;
  onToggleTokens: () => void;
  view3D: boolean;
  onToggleView3D: () => void;
  layerSpacing: any; 
  viewRotateX: any;
  viewRotateZ: any;
}

export const Inspector: React.FC<InspectorPanelProps> = ({
  showMeasurements,
  onToggleMeasurements,
  showTokens,
  onToggleTokens,
  view3D,
  onToggleView3D,
  layerSpacing,
  viewRotateX,
  viewRotateZ
}) => {
  const { theme } = useTheme();

  return (
    <>
      <label style={{ ...theme.Type.Readable.Label.S, display: 'block', marginBottom: theme.spacing['Space.M'], color: theme.Color.Base.Content[2], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Inspector
      </label>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
        <Toggle
          label="Show Measurements"
          isOn={showMeasurements}
          onToggle={onToggleMeasurements}
        />
        <Toggle
          label="Show Tokens"
          isOn={showTokens}
          onToggle={onToggleTokens}
        />
        <Toggle
          label="3D Layer View"
          isOn={view3D}
          onToggle={onToggleView3D}
        />
        
        {view3D && (
          <div style={{ 
            marginTop: theme.spacing['Space.S'], 
            padding: theme.spacing['Space.M'], 
            backgroundColor: theme.Color.Base.Surface[2], 
            borderRadius: theme.radius['Radius.M'],
            border: `1px solid ${theme.Color.Base.Surface[3]}`,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing['Space.M']
          }}>
             <RangeSlider
              label="Layer Spacing"
              motionValue={layerSpacing}
              onCommit={() => {}}
              min={0}
              max={150}
            />
            <RangeSlider
              label="Rotate X"
              motionValue={viewRotateX}
              onCommit={() => {}}
              min={0}
              max={90}
            />
            <RangeSlider
              label="Rotate Z"
              motionValue={viewRotateZ}
              onCommit={() => {}}
              min={0}
              max={360}
            />
          </div>
        )}
      </div>
    </>
  );
};
