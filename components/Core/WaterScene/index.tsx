

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { WaterConfig, NoiseType, NoiseBlendingMode } from '../../../types/index.tsx';
import { createSandTexture } from './utils/createSandTexture.ts';
import { godRayVertexShader, godRayFragmentShader } from './shaders/godray.ts';
import { rippleVertexShader, rippleFragmentShader } from './shaders/ripple.ts';
import { waterVertexShader, waterFragmentShader } from './shaders/water.ts';
import { terrainVertexShader, terrainFragmentShader } from './shaders/terrain.ts';
import { SceneController } from '../../App/MetaPrototype.tsx';

interface Impact {
    x: number;
    z: number;
    u: number;
    v: number;
    strength: number;
    startTime: number;
}

const MAX_IMPACTS = 10;

interface WaterSceneProps {
  config: WaterConfig;
  isSplitView: boolean;
  initialCameraState?: { position: [number, number, number], target: [number, number, number] } | null;
  sceneController?: React.MutableRefObject<Partial<SceneController>>;
  mouseHoverEnabled?: boolean;
}

// --- MODULE-LEVEL CACHE FOR HDR ASSETS ---
interface CachedEnv {
    envMap: THREE.Texture;
    skyTexture: THREE.DataTexture;
}
const envCache = new Map<string, CachedEnv>();
let isProcessingHdr = false;

const WaterScene: React.FC<WaterSceneProps> = ({ config, initialCameraState, sceneController, isSplitView }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const frameIdRef = useRef<number>(0);
  const materialsRef = useRef<THREE.Material[]>([]);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const sandTextureRef = useRef<THREE.Texture | null>(null);
  const skyTextureRef = useRef<THREE.DataTexture | null>(null);
  const envMapRef = useRef<THREE.Texture | null>(null);
  const currentHdrUrlRef = useRef<string | null>(null);
  const hdrLoaderRef = useRef<HDRLoader | null>(null);
  const pmremGeneratorRef = useRef<THREE.PMREMGenerator | null>(null);
  const lastCameraState = useRef<{position: THREE.Vector3, target: THREE.Vector3} | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const isUnderwater = useRef<boolean>(false);
  const isInteracting = useRef<boolean>(false);
  
  // --- SIMULATION REFS ---
  const simSceneRef = useRef<THREE.Scene | null>(null);
  const simCameraRef = useRef<THREE.Camera | null>(null);
  const simMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const renderTargetA = useRef<THREE.WebGLRenderTarget | null>(null);
  const renderTargetB = useRef<THREE.WebGLRenderTarget | null>(null);
  
  // Interaction Refs
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const interactionPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const discreteImpactsRef = useRef<Impact[]>([]);
  const textureImpactsToProcessRef = useRef<Impact[]>([]);


  // God Rays & Bubbles Refs
  const raysGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    clockRef.current = new THREE.Clock();

    // 1. Generate Sand Texture
    sandTextureRef.current = createSandTexture();
    
    // 2. Initialize Loaders & Generators
    hdrLoaderRef.current = new HDRLoader();
    
    // Default placeholder 1x1 grey
    const defaultTex = new THREE.DataTexture(new Float32Array([0.5, 0.5, 0.5, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
    defaultTex.needsUpdate = true;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    pmremGeneratorRef.current = new THREE.PMREMGenerator(renderer);
    pmremGeneratorRef.current.compileEquirectangularShader();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Initial State - use a dark neutral color to avoid gray flash
    scene.background = new THREE.Color(0x101015);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 4000);
    cameraRef.current = camera;
    if (initialCameraState) camera.position.set(...initialCameraState.position);
    else camera.position.set(0, 45, 160);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    if (initialCameraState) controls.target.set(...initialCameraState.target);

    // --- Scene Controller Setup ---
    if (sceneController) {
        sceneController.current.addDiscreteImpact = () => {
            if (!clockRef.current) return;
            const x = (Math.random() - 0.5) * 150;
            const z = (Math.random() - 0.5) * 150;
            const u = (x + 2000) / 4000;
            const v = (-z + 2000) / 4000;
            const newImpact: Impact = {
                x,
                z,
                u,
                v,
                strength: configRef.current.impactStrength,
                startTime: clockRef.current.getElapsedTime(),
            };
            discreteImpactsRef.current.push(newImpact);
            textureImpactsToProcessRef.current.push(newImpact);
        };
    }

    // --- GOD RAYS SETUP ---
    const rayGeo = new THREE.ConeGeometry(20, 150, 16, 1, true); 
    rayGeo.translate(0, -75, 0); // Pivot at top
    rayGeo.rotateX(-Math.PI); // Point down
    
    const rayMat = new THREE.ShaderMaterial({
        vertexShader: godRayVertexShader,
        fragmentShader: godRayFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(configRef.current.colorShallow) },
            uLightIntensity: { value: configRef.current.underwaterLightIntensity },
            uCameraPos: { value: new THREE.Vector3() }
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    materialsRef.current.push(rayMat);

    const raysGroup = new THREE.Group();
    raysGroup.position.y = -2; // Just below surface
    raysGroupRef.current = raysGroup;
    scene.add(raysGroup);

    for (let i = 0; i < 10; i++) {
        const ray = new THREE.Mesh(rayGeo, rayMat);
        const r = 10 + Math.random() * 80;
        const a = Math.random() * Math.PI * 2;
        ray.position.set(Math.cos(a)*r, 0, Math.sin(a)*r);
        ray.rotation.x = (Math.random() - 0.5) * 0.3;
        ray.rotation.z = (Math.random() - 0.5) * 0.3;
        ray.scale.setScalar(0.8 + Math.random() * 1.5);
        raysGroup.add(ray);
    }

    // --- RIPPLE SIMULATION SETUP ---
    const simSize = 256;
    const rtOptions = {
        type: THREE.HalfFloatType, 
        minFilter: THREE.NearestFilter, 
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
    };
    // Initialize both targets (Ping Pong buffers)
    renderTargetA.current = new THREE.WebGLRenderTarget(simSize, simSize, rtOptions);
    renderTargetB.current = new THREE.WebGLRenderTarget(simSize, simSize, rtOptions);
    
    const simScene = new THREE.Scene();
    simSceneRef.current = simScene;
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    simCameraRef.current = simCamera;
    
    const simGeometry = new THREE.PlaneGeometry(2, 2);
    const simMaterial = new THREE.ShaderMaterial({
        vertexShader: rippleVertexShader,
        fragmentShader: rippleFragmentShader,
        uniforms: {
            tDiffuse: { value: null }, // Previous frame state
            uResolution: { value: new THREE.Vector2(simSize, simSize) },
            uMouse: { value: new THREE.Vector2(-10, -10) }, // Initialize off-screen
            uStrength: { value: configRef.current.rippleStrength },
            uRadius: { value: configRef.current.rippleRadius },
            uDamping: { value: configRef.current.rippleDamping },
            uSpeed: { value: configRef.current.rippleSpeed },
            uViscosity: { value: configRef.current.rippleViscosity },
            uMouseDown: { value: false },
            uImpacts: { value: Array(MAX_IMPACTS).fill(new THREE.Vector3()) },
            uImpactCount: { value: 0 },
            uGentleImpact: { value: configRef.current.gentleImpact },
        }
    });
    simMaterialRef.current = simMaterial;
    simScene.add(new THREE.Mesh(simGeometry, simMaterial));

    // --- 1. SEABED ---
    const bedGeo = new THREE.PlaneGeometry(4000, 4000, 64, 64);
    // Note: We rotate the MESH, not the geometry, so the vertex shader can use local XY for noise generation
    const bedMat = new THREE.ShaderMaterial({
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorDeep: { value: new THREE.Color(configRef.current.colorDeep) },
            uColorShallow: { value: new THREE.Color(configRef.current.colorShallow) },
            uLightIntensity: { value: configRef.current.underwaterLightIntensity },
            tSand: { value: sandTextureRef.current },
            uCausticsIntensity: { value: configRef.current.causticsIntensity },
            uCausticsScale: { value: configRef.current.causticsScale },
            uCausticsSpeed: { value: configRef.current.causticsSpeed },
            uCameraPos: { value: new THREE.Vector3() },
            uFogColor: { value: new THREE.Color(configRef.current.underwaterFogColor) },
            uFogNear: { value: configRef.current.fogCutoffStart },
            uFogFar: { value: configRef.current.fogCutoffEnd },
        },
        side: THREE.DoubleSide,
        fog: false // Disable scene fog for this material, we handle it in shader
    });
    materialsRef.current.push(bedMat);
    const seabed = new THREE.Mesh(bedGeo, bedMat);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -80;
    scene.add(seabed);

    // --- 2. WATER SURFACE ---
    const waterGeo = new THREE.PlaneGeometry(4000, 4000, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);

    const textureLoader = new THREE.TextureLoader();
    const normalMapTexture = textureLoader.load(configRef.current.normalMapUrl, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
    });
    const noiseMapTexture = textureLoader.load(configRef.current.surfaceTextureUrl, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
    });
    
    // --- FIX: Initialize ramp uniforms with values from the initial config ---
    const initialConfig = configRef.current;
    const initialRampColors = [
        new THREE.Color(initialConfig.colorRampStop1Color),
        new THREE.Color(initialConfig.colorRampStop2Color),
        new THREE.Color(initialConfig.colorRampStop3Color),
        new THREE.Color(initialConfig.colorRampStop4Color),
        new THREE.Color(initialConfig.colorRampStop5Color),
    ];
    const initialRampPositions = [
        initialConfig.colorRampStop1Position,
        initialConfig.colorRampStop2Position,
        initialConfig.colorRampStop3Position,
        initialConfig.colorRampStop4Position,
        initialConfig.colorRampStop5Position,
    ];
    let initialStopCount = 2;
    if (initialConfig.useColorRampStop3) initialStopCount++;
    if (initialConfig.useColorRampStop4) initialStopCount++;
    if (initialConfig.useColorRampStop5) initialStopCount++;
    // --- END FIX ---

    const waterMat = new THREE.ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorDeep: { value: new THREE.Color(configRef.current.colorDeep) },
            uColorShallow: { value: new THREE.Color(configRef.current.colorShallow) },
            uSunPosition: { value: new THREE.Vector3(50, 100, -100) },
            uTransparency: { value: configRef.current.transparency },
            uRoughness: { value: configRef.current.roughness },
            uSunIntensity: { value: configRef.current.sunIntensity },
            // Layer A
            uWaveHeight: { value: configRef.current.waveHeight },
            uWaveSpeed: { value: configRef.current.waveSpeed },
            uWaveScale: { value: configRef.current.waveScale },
            uNormalFlatness: { value: configRef.current.normalFlatness },
            uNoiseType: { value: 0 },
            // Layer B & Blending A/B
            uUseNoiseLayerB: { value: configRef.current.useNoiseLayerB },
            uNoiseBlendingModeAB: { value: 0 },
            uNoiseBlendAB: { value: configRef.current.noiseBlendAB },
            uNoiseTypeB: { value: 1 },
            uWaveHeightB: { value: configRef.current.waveHeightB },
            uWaveSpeedB: { value: configRef.current.waveSpeedB },
            uWaveScaleB: { value: configRef.current.waveScaleB },
            // Layer C & Blending B/C
            uUseNoiseLayerC: { value: configRef.current.useNoiseLayerC },
            uNoiseBlendingModeBC: { value: 0 },
            uNoiseBlendBC: { value: configRef.current.noiseBlendBC },
            uNoiseTypeC: { value: 0 },
            uWaveHeightC: { value: configRef.current.waveHeightC },
            uWaveSpeedC: { value: configRef.current.waveSpeedC },
            uWaveScaleC: { value: configRef.current.waveScaleC },
            // ---
            uIOR: { value: configRef.current.ior },
            tRipple: { value: null },
            uRippleIntensity: { value: configRef.current.rippleIntensity },
            uRippleNormalIntensity: { value: configRef.current.rippleNormalIntensity },
            uResolution: { value: new THREE.Vector2(simSize, simSize) },
            tSky: { value: defaultTex },
            // Normal Map Uniforms
            tNormalMap: { value: normalMapTexture },
            uUseTextureNormals: { value: configRef.current.useTextureNormals },
            uNormalMapScale: { value: configRef.current.normalMapScale },
            uNormalMapSpeed: { value: configRef.current.normalMapSpeed },
            uNormalMapStrength: { value: configRef.current.normalMapStrength },
            // Surface Texture (Foam) Uniforms
            tSurfaceMap: { value: noiseMapTexture },
            uUseTextureSurface: { value: configRef.current.useTextureSurface },
            uFoamColor: { value: new THREE.Color(configRef.current.foamColor) },
            uSurfaceTextureScale: { value: configRef.current.surfaceTextureScale },
            uSurfaceTextureSpeed: { value: configRef.current.surfaceTextureSpeed },
            uSurfaceTextureStrength: { value: configRef.current.surfaceTextureStrength },
            // Displacement Map Uniforms
            tDisplacementMap: { value: noiseMapTexture },
            uUseDisplacement: { value: configRef.current.useDisplacement },
            uDisplacementStrength: { value: configRef.current.displacementStrength },
            uDisplacementSpeed: { value: configRef.current.displacementSpeed },
            // Color Ramp Uniforms
            uUseColorRamp: { value: initialConfig.useColorRamp },
            uColorRamp: { value: initialRampColors },
            uColorRampPositions: { value: initialRampPositions },
            uColorRampStopCount: { value: initialStopCount },
            uColorRampNoiseType: { value: 0 },
            uColorRampNoiseScale: { value: initialConfig.colorRampNoiseScale },
            uColorRampNoiseSpeed: { value: initialConfig.colorRampNoiseSpeed },
            uColorRampNoiseMix: { value: initialConfig.colorRampNoiseMix },
            // Vertex Impacts
            uUseVertexImpacts: { value: configRef.current.useVertexImpacts },
            uVertexImpacts: { value: Array(MAX_IMPACTS).fill(new THREE.Vector4()) },
            uVertexImpactCount: { value: 0 },
            uDebugNormals: { value: configRef.current.debugNormals },
            uSmoothNormalScroll: { value: configRef.current.smoothNormalScroll },
            uGentleImpact: { value: configRef.current.gentleImpact },
        },
        transparent: true,
        side: THREE.DoubleSide,
    });
    materialsRef.current.push(waterMat);
    const water = new THREE.Mesh(waterGeo, waterMat);
    waterMeshRef.current = water;
    scene.add(water);
    
    const tempColor = new THREE.Color();
    const noiseMap: Record<NoiseType, number> = { simplex: 0, perlin: 1, voronoi: 2 };
    const blendMap: Record<NoiseBlendingMode, number> = { add: 0, multiply: 1, mix: 2 };

    const animate = () => {
        if (!clockRef.current) return;
        const time = clockRef.current.getElapsedTime();
        const target = configRef.current;
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const simMat = simMaterialRef.current;

        if (!renderer || !scene || !camera || !simMat) {
            frameIdRef.current = requestAnimationFrame(animate);
            return;
        }

        // --- TRANSITION LAYER (Interpolation) ---
        const lerpFactor = 0.1; // Smoothness of transitions

        // --- IMPACT MANAGEMENT ---
        discreteImpactsRef.current = discreteImpactsRef.current.filter(i => time - i.startTime < 5.0);

        // --- UPDATE SIM UNIFORMS ---
        if (simMat) {
            const su = simMat.uniforms;
            su.uStrength.value = THREE.MathUtils.lerp(su.uStrength.value, target.rippleStrength, lerpFactor);
            su.uRadius.value = THREE.MathUtils.lerp(su.uRadius.value, target.rippleRadius, lerpFactor);
            su.uDamping.value = THREE.MathUtils.lerp(su.uDamping.value, target.rippleDamping, lerpFactor);
            su.uSpeed.value = THREE.MathUtils.lerp(su.uSpeed.value, target.rippleSpeed, lerpFactor);
            su.uViscosity.value = THREE.MathUtils.lerp(su.uViscosity.value, target.rippleViscosity, lerpFactor);
            su.uGentleImpact.value = target.gentleImpact;
        }

        // --- UPDATE WATER UNIFORMS ---
        if (waterMeshRef.current) {
            const waterMat = waterMeshRef.current.material as THREE.ShaderMaterial;
            const u = waterMat.uniforms;

            // Colors
            tempColor.set(target.colorDeep);
            u.uColorDeep.value.lerp(tempColor, lerpFactor);
            tempColor.set(target.colorShallow);
            u.uColorShallow.value.lerp(tempColor, lerpFactor);
            
            // Scalars
            u.uTransparency.value = THREE.MathUtils.lerp(u.uTransparency.value, target.transparency, lerpFactor);
            u.uRoughness.value = THREE.MathUtils.lerp(u.uRoughness.value, target.roughness, lerpFactor);
            u.uSunIntensity.value = THREE.MathUtils.lerp(u.uSunIntensity.value, target.sunIntensity, lerpFactor);
            u.uIOR.value = THREE.MathUtils.lerp(u.uIOR.value, target.ior, lerpFactor);

            // Layer A
            u.uWaveHeight.value = THREE.MathUtils.lerp(u.uWaveHeight.value, target.waveHeight, lerpFactor);
            u.uWaveSpeed.value = THREE.MathUtils.lerp(u.uWaveSpeed.value, target.waveSpeed, lerpFactor);
            u.uWaveScale.value = THREE.MathUtils.lerp(u.uWaveScale.value, target.waveScale, lerpFactor);
            u.uNormalFlatness.value = THREE.MathUtils.lerp(u.uNormalFlatness.value, target.normalFlatness, lerpFactor);
            u.uNoiseType.value = noiseMap[target.noiseType] ?? 0;

            // Layer B
            u.uUseNoiseLayerB.value = target.useNoiseLayerB;
            u.uNoiseBlendingModeAB.value = blendMap[target.noiseBlendingModeAB] ?? 0;
            u.uNoiseBlendAB.value = THREE.MathUtils.lerp(u.uNoiseBlendAB.value, target.noiseBlendAB, lerpFactor);
            u.uNoiseTypeB.value = noiseMap[target.noiseTypeB] ?? 1;
            u.uWaveHeightB.value = THREE.MathUtils.lerp(u.uWaveHeightB.value, target.waveHeightB, lerpFactor);
            u.uWaveSpeedB.value = THREE.MathUtils.lerp(u.uWaveSpeedB.value, target.waveSpeedB, lerpFactor);
            u.uWaveScaleB.value = THREE.MathUtils.lerp(u.uWaveScaleB.value, target.waveScaleB, lerpFactor);

            // Layer C
            u.uUseNoiseLayerC.value = target.useNoiseLayerC;
            u.uNoiseBlendingModeBC.value = blendMap[target.noiseBlendingModeBC] ?? 0;
            u.uNoiseBlendBC.value = THREE.MathUtils.lerp(u.uNoiseBlendBC.value, target.noiseBlendBC, lerpFactor);
            u.uNoiseTypeC.value = noiseMap[target.noiseTypeC] ?? 0;
            u.uWaveHeightC.value = THREE.MathUtils.lerp(u.uWaveHeightC.value, target.waveHeightC, lerpFactor);
            u.uWaveSpeedC.value = THREE.MathUtils.lerp(u.uWaveSpeedC.value, target.waveSpeedC, lerpFactor);
            u.uWaveScaleC.value = THREE.MathUtils.lerp(u.uWaveScaleC.value, target.waveScaleC, lerpFactor);

            // Texture Normals
            u.uUseTextureNormals.value = target.useTextureNormals;
            u.uNormalMapScale.value = THREE.MathUtils.lerp(u.uNormalMapScale.value, target.normalMapScale, lerpFactor);
            u.uNormalMapSpeed.value = THREE.MathUtils.lerp(u.uNormalMapSpeed.value, target.normalMapSpeed, lerpFactor);
            u.uNormalMapStrength.value = THREE.MathUtils.lerp(u.uNormalMapStrength.value, target.normalMapStrength, lerpFactor);

            // Foam
            u.uUseTextureSurface.value = target.useTextureSurface;
            tempColor.set(target.foamColor);
            u.uFoamColor.value.lerp(tempColor, lerpFactor);
            u.uSurfaceTextureScale.value = THREE.MathUtils.lerp(u.uSurfaceTextureScale.value, target.surfaceTextureScale, lerpFactor);
            u.uSurfaceTextureSpeed.value = THREE.MathUtils.lerp(u.uSurfaceTextureSpeed.value, target.surfaceTextureSpeed, lerpFactor);
            u.uSurfaceTextureStrength.value = THREE.MathUtils.lerp(u.uSurfaceTextureStrength.value, target.surfaceTextureStrength, lerpFactor);

            // Displacement
            u.uUseDisplacement.value = target.useDisplacement;
            u.uDisplacementStrength.value = THREE.MathUtils.lerp(u.uDisplacementStrength.value, target.displacementStrength, lerpFactor);
            u.uDisplacementSpeed.value = THREE.MathUtils.lerp(u.uDisplacementSpeed.value, target.displacementSpeed, lerpFactor);

            // Color Ramp
            u.uUseColorRamp.value = target.useColorRamp;
            u.uColorRampNoiseType.value = noiseMap[target.colorRampNoiseType] ?? 0;
            u.uColorRampNoiseScale.value = THREE.MathUtils.lerp(u.uColorRampNoiseScale.value, target.colorRampNoiseScale, lerpFactor);
            u.uColorRampNoiseSpeed.value = THREE.MathUtils.lerp(u.uColorRampNoiseSpeed.value, target.colorRampNoiseSpeed, lerpFactor);
            u.uColorRampNoiseMix.value = THREE.MathUtils.lerp(u.uColorRampNoiseMix.value, target.colorRampNoiseMix, lerpFactor);
            
            const rampColors = [target.colorRampStop1Color, target.colorRampStop2Color, target.colorRampStop3Color, target.colorRampStop4Color, target.colorRampStop5Color];
            const rampPositions = [target.colorRampStop1Position, target.colorRampStop2Position, target.colorRampStop3Position, target.colorRampStop4Position, target.colorRampStop5Position];

            for (let i = 0; i < 5; i++) {
                tempColor.set(rampColors[i]);
                u.uColorRamp.value[i].lerp(tempColor, lerpFactor);
                u.uColorRampPositions.value[i] = THREE.MathUtils.lerp(u.uColorRampPositions.value[i], rampPositions[i], lerpFactor);
            }

            let stopCount = 2;
            if (target.useColorRampStop3) stopCount++;
            if (target.useColorRampStop4) stopCount++;
            if (target.useColorRampStop5) stopCount++;
            u.uColorRampStopCount.value = stopCount;

            u.uRippleIntensity.value = THREE.MathUtils.lerp(u.uRippleIntensity.value, target.rippleIntensity, lerpFactor);
            u.uRippleNormalIntensity.value = THREE.MathUtils.lerp(u.uRippleNormalIntensity.value, target.rippleNormalIntensity, lerpFactor);
            u.uDebugNormals.value = target.debugNormals;
            u.uSmoothNormalScroll.value = target.smoothNormalScroll;
            u.uGentleImpact.value = target.gentleImpact;

            // Vertex Impacts
            u.uUseVertexImpacts.value = target.useVertexImpacts;
            if (target.useVertexImpacts) {
                const impacts = discreteImpactsRef.current.slice(0, MAX_IMPACTS);
                const impactData = impacts.map(i => new THREE.Vector4(i.x, i.z, i.strength, i.startTime));
                while (impactData.length < MAX_IMPACTS) {
                    impactData.push(new THREE.Vector4());
                }
                u.uVertexImpactCount.value = impacts.length;
                u.uVertexImpacts.value = impactData;
            } else {
                u.uVertexImpactCount.value = 0;
            }
        }

        // --- RIPPLE STEP (Ping-Pong) ---
        if (simSceneRef.current && simCameraRef.current && renderTargetA.current && renderTargetB.current) {
            
            // Texture Impacts
            if (target.useTextureImpacts && textureImpactsToProcessRef.current.length > 0) {
                const impacts = textureImpactsToProcessRef.current.slice(0, MAX_IMPACTS);
                const impactData = impacts.map(i => new THREE.Vector3(
                    i.u,
                    i.v,
                    i.strength
                ));
                // --- FIX: Pad the array to match the shader's expected size ---
                while (impactData.length < MAX_IMPACTS) {
                    impactData.push(new THREE.Vector3());
                }
                simMat.uniforms.uImpactCount.value = impacts.length;
                simMat.uniforms.uImpacts.value = impactData;
                textureImpactsToProcessRef.current = [];
            } else {
                simMat.uniforms.uImpactCount.value = 0;
            }

            // Use Buffer A (Current/Previous State) to Compute Buffer B (Next State)
            simMat.uniforms.tDiffuse.value = renderTargetA.current.texture;
            
            renderer.setRenderTarget(renderTargetB.current);
            renderer.render(simSceneRef.current, simCameraRef.current);
            renderer.setRenderTarget(null);

            // Swap Buffers: B becomes the new A (Current)
            const temp = renderTargetA.current;
            renderTargetA.current = renderTargetB.current;
            renderTargetB.current = temp;

            // Reset interaction flag after frame
            simMat.uniforms.uMouseDown.value = false;
            
            // Pass the updated state (now in A) to the water material
            if (waterMeshRef.current) {
                (waterMeshRef.current.material as THREE.ShaderMaterial).uniforms.tRipple.value = renderTargetA.current.texture;
            }
        }

        materialsRef.current.forEach(mat => {
            if(mat instanceof THREE.ShaderMaterial && mat.uniforms.uTime) mat.uniforms.uTime.value = time;
        });
        
        // Update Camera Position for Seabed Fog
        if (bedMat.uniforms.uCameraPos) {
            bedMat.uniforms.uCameraPos.value.copy(camera.position);
        }

        // --- CAMERA & ENVIRONMENT LOGIC (PER-FRAME) ---
        const camY = camera.position.y;
        const waveApprox = Math.sin(camera.position.x * 0.1 * target.waveScale + time * target.waveSpeed) * target.waveHeight;
        isUnderwater.current = camY < (waveApprox);

        // Update underwater state
        if (isUnderwater.current) {
            // UNDERWATER STATE
            // Sync Scene Fog to Custom Fog Color
            const fogColor = new THREE.Color(target.underwaterFogColor);
            
            scene.background = fogColor;
            if (!scene.fog) { // create fog if it doesn't exist
                scene.fog = new THREE.Fog(fogColor, target.fogCutoffStart, target.fogCutoffEnd);
            } else { // update existing fog
                if (scene.fog instanceof THREE.Fog) {
                    scene.fog.color.copy(fogColor);
                    scene.fog.near = target.fogCutoffStart;
                    scene.fog.far = target.fogCutoffEnd;
                }
            }
            scene.environment = null;
            if(raysGroupRef.current) raysGroupRef.current.visible = true;
        } else {
            // SURFACE STATE
            if (skyTextureRef.current && envMapRef.current) {
                scene.background = skyTextureRef.current;
                scene.environment = envMapRef.current;
            } else {
                scene.background = new THREE.Color(0x101015); 
                scene.environment = null;
            }
            scene.fog = null;
            if(raysGroupRef.current) raysGroupRef.current.visible = false;
        }
        
        if (isUnderwater.current || isSplitView) {
            if(raysGroupRef.current) {
                const snapSize = 20;
                raysGroupRef.current.position.x = Math.round(camera.position.x / snapSize) * snapSize;
                raysGroupRef.current.position.z = Math.round(camera.position.z / snapSize) * snapSize;
            }
        }

        controlsRef.current?.update();
        
        // Direct render instead of composer for better performance if no extra passes are used
        renderer.render(scene, camera);
        
        frameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
        if(!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        rendererRef.current.setSize(w, h);
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // --- INTERACTION HANDLERS ---
    const updateMouse = (e: MouseEvent | PointerEvent) => {
        if (!containerRef.current || !cameraRef.current || !waterMeshRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        mouse.current.set(x, y);
        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        
        const intersects = raycaster.current.intersectObject(waterMeshRef.current);
        
        if (intersects.length > 0 && simMaterialRef.current) {
            const uv = intersects[0].uv;
            if (uv) {
                simMaterialRef.current.uniforms.uMouse.value.set(uv.x, uv.y);
                simMaterialRef.current.uniforms.uMouseDown.value = true;
                return true;
            }
        }
        return false;
    };

        const onPointerMove = (e: PointerEvent) => {
        if (!configRef.current.mouseHoverEnabled && !configRef.current.ripplePaintingEnabled) return;

        if (configRef.current.ripplePaintingEnabled && e.buttons === 1) {
            if (!containerRef.current || !cameraRef.current || !clockRef.current || !waterMeshRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            mouse.current.set(x, y);
            raycaster.current.setFromCamera(mouse.current, cameraRef.current);
            
            const intersects = raycaster.current.intersectObject(waterMeshRef.current);

            if (intersects.length > 0) {
                 const hit = intersects[0];
                 const uv = hit.uv;
                 if (uv) {
                    const newImpact: Impact = {
                        x: hit.point.x,
                        z: hit.point.z,
                        u: uv.x,
                        v: uv.y,
                        strength: configRef.current.impactStrength,
                        startTime: clockRef.current.getElapsedTime(),
                    };
                    discreteImpactsRef.current.push(newImpact);
                    textureImpactsToProcessRef.current.push(newImpact);
                 }
            }
        }

        if (!configRef.current.mouseHoverEnabled) return;
        const hit = updateMouse(e);
        if (hit) isInteracting.current = true;
    };
    
    const onPointerLeave = () => {
        isInteracting.current = false;
        // Move mouse offscreen in sim
        if (simMaterialRef.current) {
             simMaterialRef.current.uniforms.uMouse.value.set(-10, -10);
        }
    };

    const onPointerDown = (e: PointerEvent) => {
        if (!containerRef.current || !cameraRef.current || !clockRef.current || !waterMeshRef.current) return;
        
        // Only trigger on primary pointer (e.g., left-click or first touch)
        // to avoid conflicts with orbit controls.
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        mouse.current.set(x, y);
        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        
        const intersects = raycaster.current.intersectObject(waterMeshRef.current);

        if (intersects.length > 0) {
             const hit = intersects[0];
             const uv = hit.uv;
             if (uv) {
                const newImpact: Impact = {
                    x: hit.point.x,
                    z: hit.point.z,
                    u: uv.x,
                    v: uv.y,
                    strength: configRef.current.impactStrength,
                    startTime: clockRef.current.getElapsedTime(),
                };
                // Push to both vertex and texture impact queues
                discreteImpactsRef.current.push(newImpact);
                textureImpactsToProcessRef.current.push(newImpact);
             }
        }
    };

    containerRef.current.addEventListener('pointermove', onPointerMove);
    containerRef.current.addEventListener('pointerleave', onPointerLeave);
    containerRef.current.addEventListener('pointerdown', onPointerDown);

    return () => {
        cancelAnimationFrame(frameIdRef.current);
        window.removeEventListener('resize', handleResize);
        if(containerRef.current && rendererRef.current) {
            containerRef.current.removeEventListener('pointermove', onPointerMove);
            containerRef.current.removeEventListener('pointerleave', onPointerLeave);
            containerRef.current.removeEventListener('pointerdown', onPointerDown);
            containerRef.current.innerHTML = '';
        }
        renderTargetA.current?.dispose();
        renderTargetB.current?.dispose();
        
        // Clean up textures and generators
        pmremGeneratorRef.current?.dispose();
        envMapRef.current?.dispose();
        if (sandTextureRef.current) sandTextureRef.current.dispose();
        if (skyTextureRef.current) skyTextureRef.current.dispose();
        defaultTex.dispose();
        if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []); 

  // --- Split View Camera Control ---
  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    if (isSplitView) {
        if (!lastCameraState.current) {
            lastCameraState.current = {
                position: camera.position.clone(),
                target: controls.target.clone(),
            };
        }
        camera.position.set(0, 0, 80);
        controls.target.set(0, 0, 0);
        controls.minPolarAngle = Math.PI / 2;
        controls.maxPolarAngle = Math.PI / 2;
    } else {
        if (lastCameraState.current) {
            camera.position.copy(lastCameraState.current.position);
            controls.target.copy(lastCameraState.current.target);
            lastCameraState.current = null;
        }
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
    }
    controls.update();
  }, [isSplitView]);

  // --- Environment Loading ---
  useEffect(() => {
    if (!hdrLoaderRef.current || !sceneRef.current || !pmremGeneratorRef.current) return;

    const loader = hdrLoaderRef.current;
    const pmremGenerator = pmremGeneratorRef.current;
    
    // Use the provided HDR asset initially if skyboxUrl is not set or as a default
    const hdrUrl = config.skyboxUrl || '/sunny_rose_garden_1k.hdr';
    
    // Skip if already loading or loaded this URL
    if (currentHdrUrlRef.current === hdrUrl) return;
    currentHdrUrlRef.current = hdrUrl;

    const applyEnv = (envMap: THREE.Texture, skyTexture: THREE.DataTexture) => {
        envMapRef.current = envMap;
        skyTextureRef.current = skyTexture;
        
        if (sceneRef.current) {
            sceneRef.current.environment = envMap;
            sceneRef.current.background = envMap;
        }
        
        materialsRef.current.forEach(mat => {
            if (mat instanceof THREE.ShaderMaterial && mat.uniforms.tSky) mat.uniforms.tSky.value = skyTexture;
        });
    };

    // Check Cache First
    const cached = envCache.get(hdrUrl);
    if (cached) {
        applyEnv(cached.envMap, cached.skyTexture);
        return;
    }

    // Throttled Loading to prevent GPU command queue overload
    if (isProcessingHdr) {
        // If already processing, wait a bit and retry (simple throttle)
        const timeout = setTimeout(() => {
            currentHdrUrlRef.current = null; // Reset to allow retry
        }, 500);
        return () => clearTimeout(timeout);
    }

    isProcessingHdr = true;
    loader.load(hdrUrl, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        
        // Generate PMREM
        const newEnvMap = pmremGenerator.fromEquirectangular(texture).texture;
        
        // Cache it
        envCache.set(hdrUrl, { envMap: newEnvMap, skyTexture: texture });
        
        applyEnv(newEnvMap, texture);
        isProcessingHdr = false;
    }, undefined, (err) => {
        console.error('Error loading HDR:', err);
        isProcessingHdr = false;
    });
  }, [config.skyboxUrl, sceneController]);

  // --- Normal Map Loading ---
  useEffect(() => {
    if (!config.normalMapUrl) return;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(config.normalMapUrl, (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      materialsRef.current.forEach(mat => {
        if (mat instanceof THREE.ShaderMaterial && mat.uniforms.tNormalMap) {
          mat.uniforms.tNormalMap.value = texture;
        }
      });
    });
  }, [config.normalMapUrl]);

  // --- Surface Texture Loading ---
  useEffect(() => {
    if (!config.surfaceTextureUrl) return;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(config.surfaceTextureUrl, (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      materialsRef.current.forEach(mat => {
        if (mat instanceof THREE.ShaderMaterial && mat.uniforms.tSurfaceMap) {
          mat.uniforms.tSurfaceMap.value = texture;
        }
      });
    });
  }, [config.surfaceTextureUrl]);


  // --- CONFIG UPDATE ---
  useEffect(() => {
    const deep = new THREE.Color(config.colorDeep);
    const shallow = new THREE.Color(config.colorShallow);
    const fogColor = new THREE.Color(config.underwaterFogColor);
    const foamColor = new THREE.Color(config.foamColor);
    
    // Color Ramp Data
    const rampColors = [
        new THREE.Color(config.colorRampStop1Color),
        new THREE.Color(config.colorRampStop2Color),
        new THREE.Color(config.colorRampStop3Color),
        new THREE.Color(config.colorRampStop4Color),
        new THREE.Color(config.colorRampStop5Color),
    ];
    
    const rampPositions = [
        config.colorRampStop1Position,
        config.colorRampStop2Position,
        config.colorRampStop3Position,
        config.colorRampStop4Position,
        config.colorRampStop5Position,
    ];
    
    let stopCount = 2;
    if (config.useColorRampStop3) stopCount++;
    if (config.useColorRampStop4) stopCount++;
    if (config.useColorRampStop5) stopCount++;

    // Update Main Shaders
    for (const mat of materialsRef.current) {
        if (mat instanceof THREE.ShaderMaterial) {
            if(mat.uniforms.uColorDeep) mat.uniforms.uColorDeep.value.copy(deep);
            if(mat.uniforms.uColorShallow) mat.uniforms.uColorShallow.value.copy(shallow);
            if(mat.uniforms.uTransparency) mat.uniforms.uTransparency.value = config.transparency;
            if(mat.uniforms.uRoughness) mat.uniforms.uRoughness.value = config.roughness;
            if(mat.uniforms.uLightIntensity) mat.uniforms.uLightIntensity.value = config.underwaterLightIntensity;
            if(mat.uniforms.uSunIntensity) mat.uniforms.uSunIntensity.value = config.sunIntensity;
            if(mat.uniforms.uRippleIntensity) mat.uniforms.uRippleIntensity.value = config.rippleIntensity;
            if(mat.uniforms.uRippleNormalIntensity) mat.uniforms.uRippleNormalIntensity.value = config.rippleNormalIntensity;
            if(mat.uniforms.uNormalFlatness) mat.uniforms.uNormalFlatness.value = config.normalFlatness;
            if(mat.uniforms.uIOR) mat.uniforms.uIOR.value = config.ior;
            if(mat.uniforms.uColor) mat.uniforms.uColor.value.copy(shallow);
            if(mat.uniforms.uDebugNormals) mat.uniforms.uDebugNormals.value = config.debugNormals;
            if(mat.uniforms.uSmoothNormalScroll) mat.uniforms.uSmoothNormalScroll.value = config.smoothNormalScroll;
            if(mat.uniforms.uGentleImpact) mat.uniforms.uGentleImpact.value = config.gentleImpact;
            
            // Layer A
            if(mat.uniforms.uWaveHeight) mat.uniforms.uWaveHeight.value = config.waveHeight;
            if(mat.uniforms.uWaveSpeed) mat.uniforms.uWaveSpeed.value = config.waveSpeed;
            if(mat.uniforms.uWaveScale) mat.uniforms.uWaveScale.value = config.waveScale;
            if (mat.uniforms.uNoiseType) {
                let noiseTypeInt = 0; // simplex
                if (config.noiseType === 'perlin') noiseTypeInt = 1;
                else if (config.noiseType === 'voronoi') noiseTypeInt = 2;
                mat.uniforms.uNoiseType.value = noiseTypeInt;
            }
            
            // Layer B & Blending A/B
            if(mat.uniforms.uUseNoiseLayerB) mat.uniforms.uUseNoiseLayerB.value = config.useNoiseLayerB;
            if(mat.uniforms.uNoiseBlendAB) mat.uniforms.uNoiseBlendAB.value = config.noiseBlendAB;
            if(mat.uniforms.uWaveHeightB) mat.uniforms.uWaveHeightB.value = config.waveHeightB;
            if(mat.uniforms.uWaveSpeedB) mat.uniforms.uWaveSpeedB.value = config.waveSpeedB;
            if(mat.uniforms.uWaveScaleB) mat.uniforms.uWaveScaleB.value = config.waveScaleB;
            if (mat.uniforms.uNoiseTypeB) {
                let noiseTypeInt = 0; // simplex
                if (config.noiseTypeB === 'perlin') noiseTypeInt = 1;
                else if (config.noiseTypeB === 'voronoi') noiseTypeInt = 2;
                mat.uniforms.uNoiseTypeB.value = noiseTypeInt;
            }
            if (mat.uniforms.uNoiseBlendingModeAB) {
                let blendModeInt = 2; // mix
                if (config.noiseBlendingModeAB === 'add') blendModeInt = 0;
                else if (config.noiseBlendingModeAB === 'multiply') blendModeInt = 1;
                mat.uniforms.uNoiseBlendingModeAB.value = blendModeInt;
            }
            
            // Layer C & Blending B/C
            if(mat.uniforms.uUseNoiseLayerC) mat.uniforms.uUseNoiseLayerC.value = config.useNoiseLayerC;
            if(mat.uniforms.uNoiseBlendBC) mat.uniforms.uNoiseBlendBC.value = config.noiseBlendBC;
            if(mat.uniforms.uWaveHeightC) mat.uniforms.uWaveHeightC.value = config.waveHeightC;
            if(mat.uniforms.uWaveSpeedC) mat.uniforms.uWaveSpeedC.value = config.waveSpeedC;
            if(mat.uniforms.uWaveScaleC) mat.uniforms.uWaveScaleC.value = config.waveScaleC;
            if (mat.uniforms.uNoiseTypeC) {
                let noiseTypeInt = 0; // simplex
                if (config.noiseTypeC === 'perlin') noiseTypeInt = 1;
                else if (config.noiseTypeC === 'voronoi') noiseTypeInt = 2;
                mat.uniforms.uNoiseTypeC.value = noiseTypeInt;
            }
            if (mat.uniforms.uNoiseBlendingModeBC) {
                let blendModeInt = 0; // add
                if (config.noiseBlendingModeBC === 'multiply') blendModeInt = 1;
                else if (config.noiseBlendingModeBC === 'mix') blendModeInt = 2;
                mat.uniforms.uNoiseBlendingModeBC.value = blendModeInt;
            }

            // Textures
            if(mat.uniforms.uUseTextureNormals) mat.uniforms.uUseTextureNormals.value = config.useTextureNormals;
            if(mat.uniforms.uNormalMapScale) mat.uniforms.uNormalMapScale.value = config.normalMapScale;
            if(mat.uniforms.uNormalMapSpeed) mat.uniforms.uNormalMapSpeed.value = config.normalMapSpeed;
            if(mat.uniforms.uNormalMapStrength) mat.uniforms.uNormalMapStrength.value = config.normalMapStrength;
            if(mat.uniforms.uUseTextureSurface) mat.uniforms.uUseTextureSurface.value = config.useTextureSurface;
            if(mat.uniforms.uFoamColor) mat.uniforms.uFoamColor.value.copy(foamColor);
            if(mat.uniforms.uSurfaceTextureScale) mat.uniforms.uSurfaceTextureScale.value = config.surfaceTextureScale;
            if(mat.uniforms.uSurfaceTextureSpeed) mat.uniforms.uSurfaceTextureSpeed.value = config.surfaceTextureSpeed;
            if(mat.uniforms.uSurfaceTextureStrength) mat.uniforms.uSurfaceTextureStrength.value = config.surfaceTextureStrength;
            if(mat.uniforms.uUseDisplacement) mat.uniforms.uUseDisplacement.value = config.useDisplacement;
            if(mat.uniforms.uDisplacementStrength) mat.uniforms.uDisplacementStrength.value = config.displacementStrength;
            if(mat.uniforms.uDisplacementSpeed) mat.uniforms.uDisplacementSpeed.value = config.displacementSpeed;
            
            // Caustics Uniforms
            if(mat.uniforms.uCausticsIntensity) mat.uniforms.uCausticsIntensity.value = config.causticsIntensity;
            if(mat.uniforms.uCausticsScale) mat.uniforms.uCausticsScale.value = config.causticsScale;
            if(mat.uniforms.uCausticsSpeed) mat.uniforms.uCausticsSpeed.value = config.causticsSpeed;

            // Fog Uniforms
            if(mat.uniforms.uFogNear) mat.uniforms.uFogNear.value = config.fogCutoffStart;
            if(mat.uniforms.uFogFar) mat.uniforms.uFogFar.value = config.fogCutoffEnd;
            if(mat.uniforms.uFogColor) mat.uniforms.uFogColor.value.copy(fogColor);

            // Color Ramp Uniforms
            if(mat.uniforms.uUseColorRamp) mat.uniforms.uUseColorRamp.value = config.useColorRamp;
            if(mat.uniforms.uColorRamp) mat.uniforms.uColorRamp.value = rampColors;
            if(mat.uniforms.uColorRampPositions) mat.uniforms.uColorRampPositions.value = rampPositions;
            if(mat.uniforms.uColorRampStopCount) mat.uniforms.uColorRampStopCount.value = stopCount;
            if(mat.uniforms.uColorRampNoiseMix) mat.uniforms.uColorRampNoiseMix.value = config.colorRampNoiseMix;
            if(mat.uniforms.uColorRampNoiseScale) mat.uniforms.uColorRampNoiseScale.value = config.colorRampNoiseScale;
            if(mat.uniforms.uColorRampNoiseSpeed) mat.uniforms.uColorRampNoiseSpeed.value = config.colorRampNoiseSpeed;
            if (mat.uniforms.uColorRampNoiseType) {
                let noiseTypeInt = 0; // simplex
                if (config.colorRampNoiseType === 'perlin') noiseTypeInt = 1;
                else if (config.colorRampNoiseType === 'voronoi') noiseTypeInt = 2;
                mat.uniforms.uColorRampNoiseType.value = noiseTypeInt;
            }
        }
    }

    if (simMaterialRef.current) {
        simMaterialRef.current.uniforms.uDamping.value = config.rippleDamping;
        simMaterialRef.current.uniforms.uStrength.value = config.rippleStrength;
        simMaterialRef.current.uniforms.uRadius.value = config.rippleRadius;
        simMaterialRef.current.uniforms.uGentleImpact.value = config.gentleImpact;
    }
  }, [config]);

  return <div ref={containerRef} style={{width:'100%', height:'100%', background:'#000'}} />;
};

export default WaterScene;