
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from '../common.ts';

export const waterVertexShader = `
#define MAX_IMPACTS 10

uniform float uTime;
uniform sampler2D tRipple;

uniform float uRippleNormalIntensity;
uniform vec2 uResolution; // Added resolution uniform

// Layer A
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform float uWaveScale;
uniform int uNoiseType; // 0: Simplex, 1: Perlin, 2: Voronoi

// Layer B & Blending A/B
uniform bool uUseNoiseLayerB;
uniform int uNoiseBlendingModeAB; // 0: Add, 1: Multiply, 2: Mix
uniform float uNoiseBlendAB;
uniform float uWaveHeightB;
uniform float uWaveSpeedB;
uniform float uWaveScaleB;
uniform int uNoiseTypeB;

// Layer C & Blending B/C
uniform bool uUseNoiseLayerC;
uniform int uNoiseBlendingModeBC;
uniform float uNoiseBlendBC;
uniform float uWaveHeightC;
uniform float uWaveSpeedC;
uniform float uWaveScaleC;
uniform int uNoiseTypeC;

// Displacement Map Uniforms
uniform bool uUseDisplacement;
uniform sampler2D tDisplacementMap;
uniform float uDisplacementStrength;
uniform float uDisplacementSpeed;

// Vertex Impacts
uniform bool uUseVertexImpacts;
uniform int uVertexImpactCount;
uniform vec4 uVertexImpacts[MAX_IMPACTS]; // x, z, strength, startTime

varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying vec3 vWorldViewDir;
varying vec3 vNormal;
varying float vElevation;
${commonShaderUtils}

float getProceduralNoiseHeight(int noiseType, vec2 p, float speed, float height) {
    vec2 pos = p + vec2(uTime * speed * 0.5, uTime * speed * 0.5 * 0.4);
    float val = 0.0;
    
    if (noiseType == 0) { // Simplex FBM
        val = simplex_fbm(pos, 2, 0.5, 2.0) * height;
    } else if (noiseType == 1) { // Perlin FBM
        val = perlin_fbm(pos, 2, 0.5, 2.0) * height;
    } else if (noiseType == 2) { // Voronoi
        val = (voronoi(pos * 0.5, uTime * speed) * 2.0 - 1.0) * height;
    }
    return val;
}

float blend_heights(float h1, float h2, int mode, float mix_amount) {
    if (mode == 0) { // Add
        return h1 + h2;
    } else if (mode == 1) { // Multiply
        // Scale to [0,1], multiply, then scale back to [-1,1] space to avoid intensity loss
        return ((h1 * 0.5 + 0.5) * (h2 * 0.5 + 0.5) * 2.0 - 1.0);
    } else if (mode == 2) { // Mix
        return mix(h1, h2, mix_amount);
    }
    return h1; // Failsafe
}

float getBlendedWaveHeight(vec2 p) {
    // Layer A
    float heightA = getProceduralNoiseHeight(uNoiseType, p * uWaveScale * 0.02, uWaveSpeed, uWaveHeight * 10.0);
    
    if (!uUseNoiseLayerB) {
        return heightA;
    }
    
    // Layer B
    float heightB = getProceduralNoiseHeight(uNoiseTypeB, p * uWaveScaleB * 0.02, uWaveSpeedB, uWaveHeightB * 10.0);

    // Blend A and B
    float heightAB = blend_heights(heightA, heightB, uNoiseBlendingModeAB, uNoiseBlendAB);
    
    if (!uUseNoiseLayerC) {
        return heightAB;
    }
    
    // Layer C
    float heightC = getProceduralNoiseHeight(uNoiseTypeC, p * uWaveScaleC * 0.02, uWaveSpeedC, uWaveHeightC * 10.0);
    
    // Blend AB result with C
    float heightABC = blend_heights(heightAB, heightC, uNoiseBlendingModeBC, uNoiseBlendBC);
    
    return heightABC;
}

float getSmallWaves(vec2 pos) {
    if (uWaveHeight <= 0.001) return 0.0;
    vec2 p = pos * uWaveScale * 0.02;
    float t = uTime * uWaveSpeed * 0.5;
    float waves = sin(p.x * 5.0 + t * 2.0) * uWaveHeight * 0.5;
    waves += cos(p.y * 4.0 + t * 2.5) * uWaveHeight * 0.5;
    return waves;
}

float getVertexRippleDisplacement(vec2 pos) {
    float displacement = 0.0;
    if (uUseVertexImpacts && uVertexImpactCount > 0) {
        for (int i = 0; i < MAX_IMPACTS; i++) {
            if (i >= uVertexImpactCount) break;
            vec4 impact = uVertexImpacts[i];
            float age = uTime - impact.w;
            if (age > 0.0 && age < 5.0) {
                float dist = distance(pos, impact.xy);
                float speed = 30.0;
                float frequency = 0.2;
                float wave = sin(dist * frequency - age * speed);
                float pulse_width = 15.0;
                float pulse_envelope = smoothstep(0.0, pulse_width, dist - age * speed) * (1.0 - smoothstep(pulse_width, pulse_width + 1.0, dist - age * speed));
                float falloff_time = 1.0 - smoothstep(2.0, 4.0, age);
                displacement += wave * pulse_envelope * impact.z * falloff_time * 5.0;
            }
        }
    }
    return displacement;
}

float getSurfaceHeight(vec2 pos, vec2 uv) {
    // 1. Ripple
    float ripple = texture2D(tRipple, uv).r;
    float ripple_magnitude = abs(ripple);
    float fbm_dampening = 1.0 - smoothstep(0.0, 0.5, ripple_magnitude * uRippleNormalIntensity);

    // 2. Procedural
    float main_disp = getBlendedWaveHeight(pos);
    float small_waves = getSmallWaves(pos);
    
    // 3. Texture Disp
    float tex_disp = 0.0;
    if (uUseDisplacement) {
        vec2 disp_uv = pos * 0.05 + uTime * uDisplacementSpeed;
        tex_disp = texture2D(tDisplacementMap, disp_uv).r * uDisplacementStrength * 10.0;
    }

    // 4. Chop
    float chop = snoise(pos * 2.0 + uTime * 0.5) * 0.1 * uWaveHeight * smoothstep(0.0, 0.5, uWaveHeight);

    // 5. Vertex Ripple
    float vert_ripple = getVertexRippleDisplacement(pos);

    // Combine
    float total = (main_disp * fbm_dampening) + small_waves + chop + tex_disp + vert_ripple + (ripple * uRippleNormalIntensity);
    
    return clamp(total, -50.0, 50.0);
}

vec3 calculateTotalNormal(vec2 pos, vec2 uv) {
    // World space epsilon for finite difference
    float e = 0.1; 
    
    // Texture space epsilon for Ripple texture
    vec2 texelSize = 1.0 / uResolution; 

    float h = getSurfaceHeight(pos, uv);
    float hx = getSurfaceHeight(pos + vec2(e, 0.0), uv + vec2(texelSize.x, 0.0));
    float hz = getSurfaceHeight(pos + vec2(0.0, e), uv + vec2(0.0, texelSize.y));
    
    // Compute Finite Difference Vectors
    vec3 v1 = vec3(e, hx - h, 0.0);
    vec3 v2 = vec3(0.0, hz - h, e);
    
    return normalize(cross(v2, v1));
}

void main() {
    vec3 pos = position;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    
    // Calculate total displacement using unified function
    float total_displacement = getSurfaceHeight(worldPosition.xz, uv);
    pos.y += total_displacement;

    vElevation = pos.y;
    vec4 finalWorldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = finalWorldPos.xyz;

    // Normal calculation
    vNormal = calculateTotalNormal(worldPosition.xz, uv);
    
    vec4 mvPosition = viewMatrix * finalWorldPos;
    vViewPosition = -mvPosition.xyz;
    vWorldViewDir = cameraPosition - finalWorldPos.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;
