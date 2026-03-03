

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ButtonVariant, ButtonSize } from '../components/Core/Button.tsx';

// --- Window Management ---
export type WindowId = 'control' | 'code' | 'console';

export interface WindowState {
  id: WindowId;
  title: string;
  isOpen: boolean;
  zIndex: number;
  x: number;
  y: number;
}

// --- Console Logging ---
export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
}

// --- Button Props for Meta Prototype ---
export interface MetaButtonProps {
    label: string;
    variant: ButtonVariant;
    size: ButtonSize;
    icon: string;
    customFill: string;
    customColor: string;
    customRadius: string;
    // States
    disabled: boolean;
    forcedHover: boolean;
    forcedFocus: boolean;
    forcedActive: boolean;
}

// --- Water Simulation Props ---
export type NoiseType = 'simplex' | 'perlin' | 'voronoi';
export type NoiseBlendingMode = 'add' | 'multiply' | 'mix';

export interface WaterConfig {
  // Environment
  skyboxUrl: string;

  // Visuals
  sunIntensity: number; // 0-5
  colorShallow: string;
  colorDeep: string;
  transparency: number; // 0-1
  roughness: number; // 0-1
  
  // Noise Layer A
  waveHeight: number; // 0-5
  waveSpeed: number; // 0-2
  waveScale: number; // 0-50
  normalFlatness: number; // 0-100
  noiseType: NoiseType;
  
  // Noise Layer B & A/B Blending
  useNoiseLayerB: boolean;
  noiseBlendingModeAB: NoiseBlendingMode;
  noiseBlendAB: number; // 0-1
  noiseTypeB: NoiseType;
  waveHeightB: number;
  waveSpeedB: number;
  waveScaleB: number;
  
  // Noise Layer C & B/C Blending
  useNoiseLayerC: boolean;
  noiseBlendingModeBC: NoiseBlendingMode;
  noiseBlendBC: number; // 0-1
  noiseTypeC: NoiseType;
  waveHeightC: number;
  waveSpeedC: number;
  waveScaleC: number;

  // Texture-based Normals
  useTextureNormals: boolean;
  normalMapScale: number;
  normalMapSpeed: number;
  normalMapStrength: number;
  
  // Surface Texture (Foam)
  useTextureSurface: boolean;
  foamColor: string;
  surfaceTextureScale: number;
  surfaceTextureSpeed: number;
  surfaceTextureStrength: number;

  // Secondary Normal Map (Chop)
  useSecondaryNormals: boolean;
  secondaryNormalMapScale: number;
  secondaryNormalMapSpeed: number;
  secondaryNormalMapStrength: number;

  // Specular
  specularIntensity: number; // 0 - 5
  specularSharpness: number; // 1 - 500

  // Displacement Mapping
  useDisplacement: boolean;
  displacementStrength: number;
  displacementSpeed: number;
  
  // Underwater
  underwaterDimming: number; // 0-1
  underwaterLightIntensity: number; // 0-5
  underwaterFogColor: string; // New Fog Color
  ior: number; // 1.0 - 2.33
  fogCutoffStart: number;
  fogCutoffEnd: number;
  
  // Ripple Physics
  rippleDamping: number; // 0.9 - 0.999
  rippleStrength: number; // 0.01 - 1.0
  rippleRadius: number; // 0.01 - 0.2

  rippleNormalIntensity: number; // 0.0 - 20.0
  rippleViscosity: number; // 0.0 - 0.2
  rippleSpeed: number; // 0.1 - 2.0
  
  // Caustics
  causticsIntensity: number; // 0 - 5
  causticsScale: number; // 0.01 - 1.0
  causticsSpeed: number; // 0 - 5

  // Color Ramp
  useColorRamp: boolean;
  colorRampNoiseType: NoiseType;
  colorRampNoiseScale: number;
  colorRampNoiseSpeed: number;
  colorRampNoiseMix: number; // 0-1 blend with base colors
  useColorRampStop3: boolean;
  useColorRampStop4: boolean;
  useColorRampStop5: boolean;
  colorRampStop1Color: string;
  colorRampStop1Position: number; // 0-1
  colorRampStop2Color: string;
  colorRampStop2Position: number; // 0-1
  colorRampStop3Color: string;
  colorRampStop3Position: number; // 0-1
  colorRampStop4Color: string;
  colorRampStop4Position: number; // 0-1
  colorRampStop5Color: string;
  colorRampStop5Position: number; // 0-1

  // Discrete Ripples
  useTextureImpacts: boolean;
  useVertexImpacts: boolean;
  impactStrength: number;
  mouseHoverEnabled: boolean;
  smoothNormalScroll: boolean;
  gentleImpact: boolean;
  ripplePaintingEnabled: boolean;
  normalMapUrl: string;
  surfaceTextureUrl: string;
  debugNormals: boolean;
}
