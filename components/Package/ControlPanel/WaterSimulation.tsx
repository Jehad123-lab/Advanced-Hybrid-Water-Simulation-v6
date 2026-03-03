

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { useMotionValue } from 'framer-motion';
import { useTheme } from '../../../Theme.tsx';
import { WaterConfig } from '../../../types/index.tsx';
import RangeSlider from '../../Core/RangeSlider.tsx';
import ColorPicker from '../../Core/ColorPicker.tsx';
import Select from '../../Core/Select.tsx';
import type { SkyboxOption } from '../../../environments.ts';
import Button from '../../Core/Button.tsx';
import Accordion from '../../Core/Accordion.tsx';
import Toggle from '../../Core/Toggle.tsx';

interface WaterSimulationPanelProps {
  waterConfig: WaterConfig;
  onWaterPropChange: (updates: Partial<WaterConfig>) => void;
  isSplitView: boolean;
  onToggleSplitView: () => void;
  skyboxOptions: SkyboxOption[];
  onHdrUpload: (file: File) => void;
  onAddDiscreteImpact: () => void;
  onToggleMouseHover: () => void;
  onToggleRipplePainting: () => void;
  onNormalMapUpload: (file: File) => void;
  onSurfaceTextureUpload: (file: File) => void;
}

// Helper for local motion values to use RangeSlider
const LocalRange: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, onChange }) => {
  const mv = useMotionValue(value);
  
  React.useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return (
    <RangeSlider
      label={label}
      motionValue={mv}
      onCommit={(v) => {
        mv.set(v);
        onChange(v);
      }}
      min={min}
      max={max}
    />
  );
};

export const WaterSimulation: React.FC<WaterSimulationPanelProps> = ({ 
    waterConfig, 
    onWaterPropChange, 
    isSplitView, 
    onToggleSplitView, 
    skyboxOptions, 
    onHdrUpload,
    onAddDiscreteImpact,
    onToggleMouseHover,
    onToggleRipplePainting,
    onNormalMapUpload,
    onSurfaceTextureUpload,
}) => {
  const { theme } = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onHdrUpload(file);
    }
  };
  
  const selectOptions = skyboxOptions.map(opt => ({ value: opt.url, label: opt.name }));

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'] }}>
        <Accordion title="Environment" defaultOpen={true}>
           <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".hdr,image/vnd.radiance"
              onChange={handleFileChange}
           />
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing['Space.S']}}>
              <Button
                  label="Split View"
                  onClick={onToggleSplitView}
                  variant={isSplitView ? 'primary' : 'secondary'}
                  size="S"
                  icon="ph-rows"
                  disabled={true}
              />
              <Button
                  label="Upload"
                  onClick={handleUploadClick}
                  variant="secondary"
                  size="S"
                  icon="ph-upload-simple"
              />
           </div>
           <Select
              label="Environment"
              value={waterConfig.skyboxUrl}
              onChange={(e) => onWaterPropChange({ skyboxUrl: e.target.value })}
              options={selectOptions}
           />
        </Accordion>

        <Accordion title="Color">
          {!waterConfig.useColorRamp && (
            <>
              <ColorPicker
                  label="Deep"
                  value={waterConfig.colorDeep}
                  onChange={(e) => onWaterPropChange({ colorDeep: e.target.value })}
              />
              <ColorPicker
                  label="Shallow"
                  value={waterConfig.colorShallow}
                  onChange={(e) => onWaterPropChange({ colorShallow: e.target.value })}
              />
            </>
          )}
          <Toggle 
            label="Use Color Ramp" 
            isOn={waterConfig.useColorRamp} 
            onToggle={() => onWaterPropChange({ useColorRamp: !waterConfig.useColorRamp })} 
          />
          {waterConfig.useColorRamp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'], marginTop: theme.spacing['Space.S'] }}>
                  <Select
                      label="Noise Type"
                      value={waterConfig.colorRampNoiseType}
                      onChange={(e) => onWaterPropChange({ colorRampNoiseType: e.target.value as any })}
                      options={[
                          { value: 'simplex', label: 'Simplex (Default)' },
                          { value: 'perlin', label: 'Perlin' },
                          { value: 'voronoi', label: 'Voronoi (Cellular)' },
                      ]}
                  />
                  <LocalRange label="Noise Scale" value={waterConfig.colorRampNoiseScale * 10} min={1} max={100} onChange={(v) => onWaterPropChange({ colorRampNoiseScale: v / 10 })} />
                  <LocalRange label="Noise Speed" value={waterConfig.colorRampNoiseSpeed * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ colorRampNoiseSpeed: v / 100 })} />
                  <LocalRange label="Blend" value={waterConfig.colorRampNoiseMix * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ colorRampNoiseMix: v / 100 })} />
                  
                  <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
                  <label style={{ ...theme.Type.Readable.Label.S, color: theme.Color.Base.Content[3] }}>Color Stops</label>

                  <div style={{ display: 'flex', gap: theme.spacing['Space.S'], alignItems: 'flex-end' }}>
                      <ColorPicker label="Stop 1" value={waterConfig.colorRampStop1Color} onChange={(e) => onWaterPropChange({ colorRampStop1Color: e.target.value })} />
                      <div style={{flex: 1}}><LocalRange label="" value={waterConfig.colorRampStop1Position * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ colorRampStop1Position: v / 100 })} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: theme.spacing['Space.S'], alignItems: 'flex-end' }}>
                      <ColorPicker label="Stop 2" value={waterConfig.colorRampStop2Color} onChange={(e) => onWaterPropChange({ colorRampStop2Color: e.target.value })} />
                      <div style={{flex: 1}}><LocalRange label="" value={waterConfig.colorRampStop2Position * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ colorRampStop2Position: v / 100 })} /></div>
                  </div>
                  
                  <Toggle label="Use Stop 3" isOn={waterConfig.useColorRampStop3} onToggle={() => onWaterPropChange({ useColorRampStop3: !waterConfig.useColorRampStop3 })} />
                  {waterConfig.useColorRampStop3 && (
                      <div style={{ display: 'flex', gap: theme.spacing['Space.S'], alignItems: 'flex-end' }}>
                          <ColorPicker label="Stop 3" value={waterConfig.colorRampStop3Color} onChange={(e) => onWaterPropChange({ colorRampStop3Color: e.target.value })} />
                          <div style={{flex: 1}}><LocalRange label="" value={waterConfig.colorRampStop3Position * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ colorRampStop3Position: v / 100 })} /></div>
                      </div>
                  )}
                  
                  <Toggle label="Use Stop 4" isOn={waterConfig.useColorRampStop4} onToggle={() => onWaterPropChange({ useColorRampStop4: !waterConfig.useColorRampStop4 })} />
                  {waterConfig.useColorRampStop4 && (
                      <div style={{ display: 'flex', gap: theme.spacing['Space.S'], alignItems: 'flex-end' }}>
                          <ColorPicker label="Stop 4" value={waterConfig.colorRampStop4Color} onChange={(e) => onWaterPropChange({ colorRampStop4Color: e.target.value })} />
                          <div style={{flex: 1}}><LocalRange label="" value={waterConfig.colorRampStop4Position * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ colorRampStop4Position: v / 100 })} /></div>
                      </div>
                  )}

                  <Toggle label="Use Stop 5" isOn={waterConfig.useColorRampStop5} onToggle={() => onWaterPropChange({ useColorRampStop5: !waterConfig.useColorRampStop5 })} />
                  {waterConfig.useColorRampStop5 && (
                      <div style={{ display: 'flex', gap: theme.spacing['Space.S'], alignItems: 'flex-end' }}>
                          <ColorPicker label="Stop 5" value={waterConfig.colorRampStop5Color} onChange={(e) => onWaterPropChange({ colorRampStop5Color: e.target.value })} />
                          <div style={{flex: 1}}><LocalRange label="" value={waterConfig.colorRampStop5Position * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ colorRampStop5Position: v / 100 })} /></div>
                      </div>
                  )}
              </div>
           )}
        </Accordion>

        <Accordion title="Waves">
          <Select
              label="Wave Noise"
              value={waterConfig.noiseType}
              onChange={(e) => onWaterPropChange({ noiseType: e.target.value as any })}
              options={[
                  { value: 'simplex', label: 'Simplex (Default)' },
                  { value: 'perlin', label: 'Perlin' },
                  { value: 'voronoi', label: 'Voronoi (Cellular)' },
              ]}
           />
          <LocalRange label="Wave Height" value={waterConfig.waveHeight * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ waveHeight: v / 10 })} />
          <LocalRange label="Wave Speed" value={waterConfig.waveSpeed * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ waveSpeed: v / 100 })} />
          <LocalRange label="Scale" value={waterConfig.waveScale * 10} min={1} max={100} onChange={(v) => onWaterPropChange({ waveScale: v / 10 })} />
          <LocalRange label="Roughness" value={waterConfig.roughness * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ roughness: v / 100 })} />
          <LocalRange label="Normal Flatness" value={waterConfig.normalFlatness} min={1} max={100} onChange={(v) => onWaterPropChange({ normalFlatness: v })} />
        </Accordion>

        <Accordion title="Wave Layers">
          <Toggle 
            label="Enable Layer B" 
            isOn={waterConfig.useNoiseLayerB} 
            onToggle={() => onWaterPropChange({ useNoiseLayerB: !waterConfig.useNoiseLayerB })} 
          />
          {waterConfig.useNoiseLayerB && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'], marginTop: theme.spacing['Space.S'] }}>
                  <Select
                      label="Blend Mode (A/B)"
                      value={waterConfig.noiseBlendingModeAB}
                      onChange={(e) => onWaterPropChange({ noiseBlendingModeAB: e.target.value as any })}
                      options={[
                          { value: 'mix', label: 'Mix' },
                          { value: 'add', label: 'Add' },
                          { value: 'multiply', label: 'Multiply' },
                      ]}
                  />
                  {waterConfig.noiseBlendingModeAB === 'mix' && (
                      <LocalRange label="Blend (A/B)" value={waterConfig.noiseBlendAB * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ noiseBlendAB: v / 100 })} />
                  )}
                  <Select
                      label="Noise Type B"
                      value={waterConfig.noiseTypeB}
                      onChange={(e) => onWaterPropChange({ noiseTypeB: e.target.value as any })}
                      options={[
                          { value: 'simplex', label: 'Simplex' },
                          { value: 'perlin', label: 'Perlin (Default)' },
                          { value: 'voronoi', label: 'Voronoi (Cellular)' },
                      ]}
                  />
                  <LocalRange label="Wave Height B" value={waterConfig.waveHeightB * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ waveHeightB: v / 10 })} />
                  <LocalRange label="Wave Speed B" value={waterConfig.waveSpeedB * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ waveSpeedB: v / 100 })} />
                  <LocalRange label="Scale B" value={waterConfig.waveScaleB * 10} min={1} max={100} onChange={(v) => onWaterPropChange({ waveScaleB: v / 10 })} />
              </div>
          )}
          
          {waterConfig.useNoiseLayerB && (
          <>
            <Toggle 
              label="Enable Layer C" 
              isOn={waterConfig.useNoiseLayerC} 
              onToggle={() => onWaterPropChange({ useNoiseLayerC: !waterConfig.useNoiseLayerC })} 
            />
            {waterConfig.useNoiseLayerC && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing['Space.M'], marginTop: theme.spacing['Space.S'] }}>
                    <Select
                        label="Blend Mode (B/C)"
                        value={waterConfig.noiseBlendingModeBC}
                        onChange={(e) => onWaterPropChange({ noiseBlendingModeBC: e.target.value as any })}
                        options={[
                            { value: 'add', label: 'Add' },
                            { value: 'multiply', label: 'Multiply' },
                            { value: 'mix', label: 'Mix' },
                        ]}
                    />
                    {waterConfig.noiseBlendingModeBC === 'mix' && (
                        <LocalRange label="Blend (B/C)" value={waterConfig.noiseBlendBC * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ noiseBlendBC: v / 100 })} />
                    )}
                    <Select
                        label="Noise Type C"
                        value={waterConfig.noiseTypeC}
                        onChange={(e) => onWaterPropChange({ noiseTypeC: e.target.value as any })}
                        options={[
                            { value: 'simplex', label: 'Simplex (Default)' },
                            { value: 'perlin', label: 'Perlin' },
                            { value: 'voronoi', label: 'Voronoi (Cellular)' },
                        ]}
                    />
                    <LocalRange label="Wave Height C" value={waterConfig.waveHeightC * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ waveHeightC: v / 10 })} />
                    <LocalRange label="Wave Speed C" value={waterConfig.waveSpeedC * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ waveSpeedC: v / 100 })} />
                    <LocalRange label="Scale C" value={waterConfig.waveScaleC * 10} min={1} max={100} onChange={(v) => onWaterPropChange({ waveScaleC: v / 10 })} />
                </div>
            )}
          </>
          )}
        </Accordion>

                <Accordion title="Surface & Foam">
          <Button
            label="Upload Normal Map"
            onClick={() => document.getElementById('normal-map-upload')?.click()}
            variant="secondary"
            size="S"
            icon="ph-upload-simple"
          />
          <input
            type="file"
            id="normal-map-upload"
            style={{ display: 'none' }}
            accept="image/*"
            onChange={(e) => e.target.files && onNormalMapUpload(e.target.files[0])}
          />
          <Button
            label="Upload Surface Texture"
            onClick={() => document.getElementById('surface-texture-upload')?.click()}
            variant="secondary"
            size="S"
            icon="ph-upload-simple"
          />
          <input
            type="file"
            id="surface-texture-upload"
            style={{ display: 'none' }}
            accept="image/*"
            onChange={(e) => e.target.files && onSurfaceTextureUpload(e.target.files[0])}
          />
          <Toggle 
            label="Texture Normals" 
            isOn={waterConfig.useTextureNormals} 
            onToggle={() => onWaterPropChange({ useTextureNormals: !waterConfig.useTextureNormals })} 
          />
          <LocalRange label="Detail Scale" value={waterConfig.normalMapScale * 10} min={1} max={50} onChange={(v) => onWaterPropChange({ normalMapScale: v / 10 })} />
          <LocalRange label="Detail Speed" value={waterConfig.normalMapSpeed * 100} min={0} max={20} onChange={(v) => onWaterPropChange({ normalMapSpeed: v / 100 })} />
          <LocalRange label="Detail Strength" value={waterConfig.normalMapStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ normalMapStrength: v / 100 })} />

          <Toggle 
            label="Enable Foam" 
            isOn={waterConfig.useTextureSurface} 
            onToggle={() => onWaterPropChange({ useTextureSurface: !waterConfig.useTextureSurface })} 
          />
          <ColorPicker
              label="Foam Color"
              value={waterConfig.foamColor}
              onChange={(e) => onWaterPropChange({ foamColor: e.target.value })}
          />
          <LocalRange label="Foam Scale" value={waterConfig.surfaceTextureScale * 10} min={1} max={50} onChange={(v) => onWaterPropChange({ surfaceTextureScale: v / 10 })} />
          <LocalRange label="Foam Speed" value={waterConfig.surfaceTextureSpeed * 100} min={0} max={20} onChange={(v) => onWaterPropChange({ surfaceTextureSpeed: v / 100 })} />
          <LocalRange label="Foam Strength" value={waterConfig.surfaceTextureStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ surfaceTextureStrength: v / 100 })} />
        </Accordion>

        <Accordion title="Surface Detail">
            <Toggle 
                label="Enable Chop" 
                isOn={waterConfig.useSecondaryNormals} 
                onToggle={() => onWaterPropChange({ useSecondaryNormals: !waterConfig.useSecondaryNormals })} 
            />
            <LocalRange label="Chop Scale" value={waterConfig.secondaryNormalMapScale * 10} min={1} max={200} onChange={(v) => onWaterPropChange({ secondaryNormalMapScale: v / 10 })} />
            <LocalRange label="Chop Speed" value={waterConfig.secondaryNormalMapSpeed * 100} min={0} max={50} onChange={(v) => onWaterPropChange({ secondaryNormalMapSpeed: v / 100 })} />
            <LocalRange label="Chop Strength" value={waterConfig.secondaryNormalMapStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ secondaryNormalMapStrength: v / 100 })} />
            <div style={{ borderTop: `1px solid ${theme.Color.Base.Surface[3]}`, margin: `${theme.spacing['Space.S']} 0` }} />
            <LocalRange label="Specular Intensity" value={waterConfig.specularIntensity * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ specularIntensity: v / 10 })} />
            <LocalRange label="Specular Sharpness" value={waterConfig.specularSharpness} min={1} max={500} onChange={(v) => onWaterPropChange({ specularSharpness: v })} />
        </Accordion>

                <Accordion title="Interaction">
          <Toggle 
            label="Enable Mouse Hover" 
            isOn={waterConfig.mouseHoverEnabled} 
            onToggle={onToggleMouseHover} 
          />
          <Toggle 
            label="Smooth Normal Scroll" 
            isOn={waterConfig.smoothNormalScroll} 
            onToggle={() => onWaterPropChange({ smoothNormalScroll: !waterConfig.smoothNormalScroll })} 
          />
          <Toggle 
            label="Gentle Impact" 
            isOn={waterConfig.gentleImpact} 
            onToggle={() => onWaterPropChange({ gentleImpact: !waterConfig.gentleImpact })} 
          />
          <Toggle 
            label="Ripple Painting" 
            isOn={waterConfig.ripplePaintingEnabled} 
            onToggle={onToggleRipplePainting} 
          />
        </Accordion>

        <Accordion title="Ripples">
          <Button label="Create Random Impact" onClick={onAddDiscreteImpact} variant="secondary" size="S" icon="ph-waves" />
          <Toggle 
            label="Use Texture Impacts" 
            isOn={waterConfig.useTextureImpacts} 
            onToggle={() => onWaterPropChange({ useTextureImpacts: !waterConfig.useTextureImpacts })} 
          />
          <Toggle 
            label="Use Vertex Impacts" 
            isOn={waterConfig.useVertexImpacts} 
            onToggle={() => onWaterPropChange({ useVertexImpacts: !waterConfig.useVertexImpacts })} 
          />
          <LocalRange label="Impact Strength" value={waterConfig.impactStrength * 100} min={10} max={200} onChange={(v) => onWaterPropChange({ impactStrength: v / 100 })} />
          <LocalRange label="Damping" value={waterConfig.rippleDamping * 1000} min={900} max={999} onChange={(v) => onWaterPropChange({ rippleDamping: v / 1000 })} />
          <LocalRange label="Strength" value={waterConfig.rippleStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ rippleStrength: v / 100 })} />
          <LocalRange label="Radius" value={waterConfig.rippleRadius * 100} min={1} max={20} onChange={(v) => onWaterPropChange({ rippleRadius: v / 100 })} />

          <LocalRange label="Normal Strength" value={waterConfig.rippleNormalIntensity} min={0} max={20} onChange={(v) => onWaterPropChange({ rippleNormalIntensity: v })} />
          <LocalRange label="Viscosity" value={waterConfig.rippleViscosity * 100} min={0} max={20} onChange={(v) => onWaterPropChange({ rippleViscosity: v / 100 })} />
          <LocalRange label="Ripple Speed" value={waterConfig.rippleSpeed * 10} min={1} max={20} onChange={(v) => onWaterPropChange({ rippleSpeed: v / 10 })} />
        </Accordion>

        <Accordion title="Underwater & Caustics">
          <Toggle 
            label="Texture Displacement" 
            isOn={waterConfig.useDisplacement} 
            onToggle={() => onWaterPropChange({ useDisplacement: !waterConfig.useDisplacement })} 
          />
          <LocalRange label="Displacement Strength" value={waterConfig.displacementStrength * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ displacementStrength: v / 100 })} />
          <LocalRange label="Displacement Speed" value={waterConfig.displacementSpeed * 100} min={0} max={20} onChange={(v) => onWaterPropChange({ displacementSpeed: v / 100 })} />
        
          <LocalRange label="Dimming" value={waterConfig.underwaterDimming * 100} min={0} max={100} onChange={(v) => onWaterPropChange({ underwaterDimming: v / 100 })} />
          <ColorPicker
              label="Fog Color"
              value={waterConfig.underwaterFogColor}
              onChange={(e) => onWaterPropChange({ underwaterFogColor: e.target.value })}
          />
          <LocalRange label="Fog Start" value={waterConfig.fogCutoffStart} min={0} max={500} onChange={(v) => onWaterPropChange({ fogCutoffStart: v })} />
          <LocalRange label="Fog End" value={waterConfig.fogCutoffEnd} min={10} max={1000} onChange={(v) => onWaterPropChange({ fogCutoffEnd: v })} />
          
          <LocalRange label="Intensity" value={waterConfig.causticsIntensity * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ causticsIntensity: v / 10 })} />
          <LocalRange label="Scale" value={waterConfig.causticsScale * 100} min={1} max={50} onChange={(v) => onWaterPropChange({ causticsScale: v / 100 })} />
          <LocalRange label="Speed" value={waterConfig.causticsSpeed * 10} min={0} max={50} onChange={(v) => onWaterPropChange({ causticsSpeed: v / 10 })} />
        </Accordion>

        <Accordion title="Debug">
          <Toggle 
            label="Debug Normals" 
            isOn={waterConfig.debugNormals} 
            onToggle={() => onWaterPropChange({ debugNormals: !waterConfig.debugNormals })} 
          />
        </Accordion>
      </div>
    </>
  );
};
