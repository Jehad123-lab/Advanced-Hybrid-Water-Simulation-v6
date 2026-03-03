

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import Stage from '../Section/Stage.tsx';
import Dock from '../Section/Dock.tsx';
import FloatingWindow from '../Package/FloatingWindow.tsx';
import ThemeToggleButton from '../Core/ThemeToggleButton.tsx';
import ControlPanel from '../Package/ControlPanel/index.tsx';
import CodePanel from '../Package/CodePanel.tsx';
import ConsolePanel from '../Package/ConsolePanel.tsx';
import { WaterConfig, WindowId, WindowState, LogEntry } from '../../types/index.tsx';
import { skyboxOptions, type SkyboxOption } from '../../environments.ts';

export interface SceneController {
  addDiscreteImpact?: () => void;
}

const getInitialWindowState = (): Record<WindowId, WindowState> => ({
  control: { id: 'control', title: 'Controls', isOpen: true, zIndex: 10, x: 0, y: 0 },
  code: { id: 'code', title: 'Code', isOpen: false, zIndex: 10, x: 0, y: 0 },
  console: { id: 'console', title: 'Console', isOpen: false, zIndex: 10, x: 0, y: 0 },
});

/**
 * 🏎️ Meta Prototype App
 * Acts as the main state orchestrator for the application.
 */
const MetaPrototype = () => {
  const { theme } = useTheme();
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(getInitialWindowState);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sceneControllerRef = useRef<Partial<SceneController>>({});
  const [isSplitView, setIsSplitView] = useState(false);
  const [mouseHoverEnabled, setMouseHoverEnabled] = useState(false);
  const [skyboxOptionsState, setSkyboxOptionsState] = useState<SkyboxOption[]>(skyboxOptions);

  const addLog = useCallback((message: string) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
    };
    setLogs(prev => [...prev.slice(-100), newLog]); // Keep last 100 logs
  }, []);

  // -- Water Simulation State --
  const [waterConfig, setWaterConfig] = useState<WaterConfig>({
    skyboxUrl: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/evening_meadow_1k.hdr",
    sunIntensity: 1.2,
    colorShallow: "#e8e7e6",
    colorDeep: "#ede1e5",
    transparency: 0.75,
    roughness: 0.18,
    waveHeight: 1.2,
    waveSpeed: 0.61,
    waveScale: 0.4,
    normalFlatness: 75,
    noiseType: "simplex",
    useNoiseLayerB: true,
    noiseBlendingModeAB: "multiply",
    noiseBlendAB: 0.89,
    noiseTypeB: "perlin",
    waveHeightB: 0.2,
    waveSpeedB: 0.6,
    waveScaleB: 4.7,
    useNoiseLayerC: false,
    noiseBlendingModeBC: "mix",
    noiseBlendBC: 0.2,
    noiseTypeC: "voronoi",
    waveHeightC: 0.05,
    waveSpeedC: 0.02,
    waveScaleC: 8,
    useTextureNormals: true,
    normalMapScale: 0.2,
    normalMapSpeed: 0.06,
    normalMapStrength: 0.28,
    useTextureSurface: true,
    foamColor: "#ffffff",
    surfaceTextureScale: 3.5,
    surfaceTextureSpeed: 0.03,
    surfaceTextureStrength: 0.6,
    useSecondaryNormals: true,
    secondaryNormalMapScale: 3,
    secondaryNormalMapSpeed: 0.03,
    secondaryNormalMapStrength: 0.31,
    specularIntensity: 2.7,
    specularSharpness: 34,
    useDisplacement: true,
    displacementStrength: 0.24,
    displacementSpeed: 0.1,
    underwaterDimming: 0.63,
    underwaterLightIntensity: 3.5,
    underwaterFogColor: "#ede1e5",
    ior: 1.33,
    fogCutoffStart: 20,
    fogCutoffEnd: 180,
    rippleDamping: 0.958,
    rippleStrength: 0.55,
    rippleRadius: 0.04,

    rippleNormalIntensity: 12,
    rippleViscosity: 0.15,
    rippleSpeed: 0.4,
    causticsIntensity: 4,
    causticsScale: 0.28,
    causticsSpeed: 1.2,
    useColorRamp: true,
    colorRampNoiseType: "perlin",
    colorRampNoiseScale: 6.9,
    colorRampNoiseSpeed: 0.58,
    colorRampNoiseMix: 0.37,
    useColorRampStop3: true,
    useColorRampStop4: false,
    useColorRampStop5: false,
    colorRampStop1Color: "#0a192f",
    colorRampStop1Position: 1,
    colorRampStop2Color: "#135a61",
    colorRampStop2Position: 0.4,
    colorRampStop3Color: "#00f6ff",
    colorRampStop3Position: 0.8,
    colorRampStop4Color: "#000000",
    colorRampStop4Position: 0.75,
    colorRampStop5Color: "#000000",
    colorRampStop5Position: 1,
    useTextureImpacts: true,
    useVertexImpacts: true,
    impactStrength: 0.62,
    mouseHoverEnabled: false,
    smoothNormalScroll: true,
    gentleImpact: true,
    ripplePaintingEnabled: false,
    debugNormals: false,
    normalMapUrl: 'https://threejs.org/examples/textures/waternormals.jpg',
    surfaceTextureUrl: 'https://threejs.org/examples/textures/waternormals.jpg'
  });

  const handleWaterConfigChange = (updates: Partial<WaterConfig>) => {
    setWaterConfig(prev => ({ ...prev, ...updates }));
    const changedKeys = Object.keys(updates).join(', ');
    addLog(`Water config updated: ${changedKeys}`);
  };

  // -- Window Management --
  const bringToFront = (id: WindowId) => {
    setWindows(prev => {
      // FIX: Explicitly type `w` as `WindowState` to resolve a TypeScript type inference issue.
      const maxZ = Math.max(...Object.values(prev).map((w: WindowState) => w.zIndex));
      if (prev[id].zIndex === maxZ) return prev; // Already in front
      return {
        ...prev,
        [id]: { ...prev[id], zIndex: maxZ + 1 },
      };
    });
  };

  const toggleWindow = (id: WindowId) => {
    setWindows(prev => {
      const isOpen = !prev[id].isOpen;
      if (isOpen) bringToFront(id);
      addLog(`Window '${id}' ${isOpen ? 'opened' : 'closed'}.`);
      return { ...prev, [id]: { ...prev[id], isOpen } };
    });
  };
  
  const handleToggleSplitView = () => {
    const nextState = !isSplitView;
    setIsSplitView(nextState);
    addLog(`Split view ${nextState ? 'enabled' : 'disabled'}.`);
  };

  const handleHdrUpload = (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.hdr')) {
      addLog('Error: Please select a valid .hdr file.');
      return;
    }
    const url = URL.createObjectURL(file);
    const newOption = { name: `Custom: ${file.name}`, url };
    
    setSkyboxOptionsState(prev => [...prev, newOption]);
    handleWaterConfigChange({ skyboxUrl: url });
    addLog(`Custom HDR '${file.name}' loaded.`);
  };

  const handleNormalMapUpload = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    handleWaterConfigChange({ normalMapUrl: url });
    addLog(`Custom normal map '${file.name}' loaded.`);
  };

  const handleSurfaceTextureUpload = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    handleWaterConfigChange({ surfaceTextureUrl: url });
    addLog(`Custom surface texture '${file.name}' loaded.`);
  };

  const handleAddDiscreteImpact = useCallback(() => {
    sceneControllerRef.current.addDiscreteImpact?.();
    addLog('Triggered discrete ripple impact.');
  }, []);

  // -- Code Panel State --
  const [codeText, setCodeText] = useState(JSON.stringify(waterConfig, null, 2));
  React.useEffect(() => {
    setCodeText(JSON.stringify(waterConfig, null, 2));
  }, [waterConfig]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '100%',
      backgroundColor: theme.Color.Base.Surface[1],
      overflow: 'hidden',
    }}>
      <Stage waterConfig={waterConfig} sceneController={sceneControllerRef} isSplitView={isSplitView} mouseHoverEnabled={mouseHoverEnabled} />
      <ThemeToggleButton />
      
      <AnimatePresence>
        {windows.control.isOpen && (
          <FloatingWindow
            {...windows.control}
            onClose={() => toggleWindow('control')}
            onFocus={() => bringToFront('control')}
          >
            <ControlPanel
              waterConfig={waterConfig}
              onWaterPropChange={handleWaterConfigChange}
              isSplitView={isSplitView}
              onToggleSplitView={handleToggleSplitView}
              skyboxOptions={skyboxOptionsState}
              onHdrUpload={handleHdrUpload}
              onAddDiscreteImpact={handleAddDiscreteImpact}
               onNormalMapUpload={handleNormalMapUpload}
               onSurfaceTextureUpload={handleSurfaceTextureUpload}
               onToggleMouseHover={() => setMouseHoverEnabled(prev => !prev)}
               onToggleRipplePainting={() => handleWaterConfigChange({ ripplePaintingEnabled: !waterConfig.ripplePaintingEnabled })}
            />
          </FloatingWindow>
        )}
        {windows.code.isOpen && (
          <FloatingWindow
            {...windows.code}
            onClose={() => toggleWindow('code')}
            onFocus={() => bringToFront('code')}
          >
            <CodePanel
              waterConfig={waterConfig}
              codeText={codeText}
              onCodeChange={(e) => setCodeText(e.target.value)}
              onCopyCode={() => { navigator.clipboard.writeText(codeText); addLog('Code copied to clipboard.'); }}
              onFocus={() => {}}
              onBlur={() => {
                try {
                  const newConfig = JSON.parse(codeText);
                  setWaterConfig(newConfig);
                  addLog('Water config updated from JSON.');
                } catch (err) {
                  addLog('Error parsing JSON.');
                }
              }}
            />
          </FloatingWindow>
        )}
        {windows.console.isOpen && (
          <FloatingWindow
            {...windows.console}
            onClose={() => toggleWindow('console')}
            onFocus={() => bringToFront('console')}
          >
            <ConsolePanel logs={logs} />
          </FloatingWindow>
        )}
      </AnimatePresence>

      <Dock windows={windows} toggleWindow={toggleWindow} />
    </div>
  );
};

export default MetaPrototype;
