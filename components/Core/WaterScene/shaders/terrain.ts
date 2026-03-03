

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from './common.ts';

export const terrainVertexShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vElevation;
${commonShaderUtils}

void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Scale down coord for broader dunes
    vec2 p = pos.xy * 0.002; 
    
    // Rolling dunes: Less jagged, more flowy
    // We combine sine waves with noise
    float dune = sin(p.x * 2.0 + p.y * 0.5) * 5.0; 
    float detail = simplex_fbm(p * 2.0, 2, 0.5, 2.0) * 15.0;
    
    float elevation = dune + detail;
    
    // Flatten near edges if you want, but here we just apply
    pos.z += elevation;
    vElevation = elevation;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    
    vec4 mvPosition = viewMatrix * worldPosition;
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const terrainFragmentShader = `
uniform float uTime;
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
uniform float uLightIntensity;
uniform sampler2D tSand; // Generated Noise Texture

// Fog / Absorption
uniform vec3 uCameraPos;
uniform vec3 uFogColor; // New Fog Color Uniform
uniform float uFogNear;
uniform float uFogFar;

// Caustics Uniforms
uniform float uCausticsIntensity;
uniform float uCausticsScale;
uniform float uCausticsSpeed;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying float vElevation;

${commonShaderUtils}

// Voronoi Caustics
vec3 getCausticRGB(vec2 uv) {
    vec3 col = vec3(0.0);
    float t = uTime;
    for(int i=0; i<3; i++) {
        float shift = float(i) * 0.005; 
        vec2 p = uv + shift;
        // Apply speed to time
        float v = voronoi(p * 0.8, t * uCausticsSpeed);
        float intensity = pow(v * 2.0, 5.0) * 10.0;
        col[i] = intensity;
    }
    return col;
}

void main() {
    // 1. TEXTURE MAPPING
    vec4 sandTex = texture2D(tSand, vWorldPos.xz * 0.1);
    float grainVal = sandTex.r; // 0..1
    
    // 2. BUMP MAPPING
    float d = 0.05;
    float hL = texture2D(tSand, (vWorldPos.xz - vec2(d, 0.0)) * 0.1).r;
    float hR = texture2D(tSand, (vWorldPos.xz + vec2(d, 0.0)) * 0.1).r;
    float hU = texture2D(tSand, (vWorldPos.xz - vec2(0.0, d)) * 0.1).r;
    float hD = texture2D(tSand, (vWorldPos.xz + vec2(0.0, d)) * 0.1).r;
    
    vec3 bumpNormal = normalize(vec3(hL - hR, 1.0, hU - hD));
    
    // 3. BASE COLOR
    vec3 baseSand = vec3(0.94, 0.87, 0.70); // Warm Sand
    vec3 wetSand = vec3(0.65, 0.55, 0.40); // Darker Wet
    
    vec3 albedo = mix(wetSand, baseSand, grainVal * 0.8 + 0.2);

    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.2));
    float diff = max(0.0, dot(bumpNormal, lightDir));
    
    albedo *= (0.6 + 0.4 * diff); 

    // 4. SPARKLES
    vec3 viewDir = normalize(vViewPosition);
    vec3 halfVec = normalize(lightDir + viewDir);
    float NdotH = max(0.0, dot(bumpNormal, halfVec));
    
    float sparkleMask = smoothstep(0.95, 1.0, grainVal);
    float specular = pow(NdotH, 100.0) * sparkleMask * 2.0;
    
    albedo += vec3(1.0) * specular;

    // 5. CAUSTICS
    float depth = max(0.0, -vWorldPos.y);
    vec3 caustics = getCausticRGB(vWorldPos.xz * uCausticsScale); 
    // Attenuate caustics with depth
    float causticVis = exp(-depth * 0.05);
    vec3 causticLight = caustics * uColorShallow * uLightIntensity * uCausticsIntensity;
    
    vec3 finalColor = albedo + causticLight * causticVis;

    // 6. REALISTIC UNDERWATER FOG
    float dist = length(vViewPosition);
    float waterDist = dist;
    
    // Handle split view / partial submersion logic if calculating from above
    if (uCameraPos.y >= 0.0) {
        vec3 rayDir = normalize(vWorldPos - uCameraPos);
        float tSurface = -uCameraPos.y / (rayDir.y + 1e-6);
        waterDist = max(0.0, dist - tSurface);
    }

    // Exponential Fog Decay
    // Map linear user controls (Near/Far) to an exponential density curve
    float fogRange = max(1.0, uFogFar - uFogNear);
    float fogNorm = max(0.0, waterDist - uFogNear) / fogRange;
    float fogFactor = 1.0 - exp(-fogNorm * 3.0); 
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    // Light Extinction (Darkening with depth)
    // Deeper objects receive less ambient light. This darkens the OBJECT, not the FOG.
    float extinction = exp(-depth * 0.015);
    vec3 attenuatedObject = finalColor * extinction;

    // Vertical Fog Grading
    // The "fog" itself (scattered light) gets darker/bluer as we go deeper
    // Mix the user's chosen scatter color with a deep abyss color
    vec3 abyssColor = uFogColor * 0.1; // Darker version of fog color
    vec3 gradFogColor = mix(uFogColor, abyssColor, smoothstep(0.0, 150.0, depth));

    finalColor = mix(attenuatedObject, gradFogColor, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;