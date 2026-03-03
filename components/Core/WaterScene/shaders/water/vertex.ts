
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

vec3 calculateTotalNormal(vec2 pos, vec2 uv) {
    // World space epsilon for FBM waves
    float e = 0.5; 
    
    // Texture space epsilon for Ripple texture (1 pixel)
    vec2 texelSize = 1.0 / uResolution; 

    // 1. Sample Ripple Data
    float r_val = texture2D(tRipple, uv).r;
    float r_x_val = texture2D(tRipple, uv + vec2(texelSize.x, 0.0)).r;
    float r_z_val = texture2D(tRipple, uv + vec2(0.0, texelSize.y)).r;
    
    // 2. Calculate FBM Dampening based on ripple strength
    float ripple_magnitude = abs(r_val);
    float fbm_dampening = 1.0 - smoothstep(0.0, 0.5, ripple_magnitude * uRippleNormalIntensity);
    
    // 3. Calculate Base Blended Wave Height with dampening
    float h_base = getBlendedWaveHeight(pos) * fbm_dampening + getSmallWaves(pos);
    float h_base_x = getBlendedWaveHeight(pos + vec2(e, 0.0)) * fbm_dampening + getSmallWaves(pos + vec2(e, 0.0));
    float h_base_z = getBlendedWaveHeight(pos + vec2(0.0, e)) * fbm_dampening + getSmallWaves(pos + vec2(0.0, e));
    
    // 4. Combine Heights for Normal Calculation
    float h = h_base + r_val * uRippleNormalIntensity;
    float hx = h_base_x + r_x_val * uRippleNormalIntensity;
    float hz = h_base_z + r_z_val * uRippleNormalIntensity;
    
    // 5. Compute Finite Difference Vectors
    vec3 v1 = vec3(e, hx - h, 0.0);
    vec3 v2 = vec3(0.0, hz - h, e);
    
    return normalize(cross(v2, v1));
}

void main() {
    vec3 pos = position;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    
    // 1. Sample Ripple
    float ripple_height = texture2D(tRipple, uv).r;
    
    // 2. Calculate FBM dampening factor
    float ripple_magnitude = abs(ripple_height);
    float fbm_dampening = 1.0 - smoothstep(0.0, 0.5, ripple_magnitude * 5.0); // Use a sensible default value

    // 3. Calculate blended procedural waves
    float main_displacement = getBlendedWaveHeight(worldPosition.xz);
    
    // 4. Calculate small ambient waves (add on top of main displacement)
    float small_waves = getSmallWaves(worldPosition.xz);

    // 5. Texture-based displacement
    float texture_displacement = 0.0;
    if (uUseDisplacement) {
        vec2 disp_uv = worldPosition.xz * 0.05 + uTime * uDisplacementSpeed;
        texture_displacement = texture2D(tDisplacementMap, disp_uv).r * uDisplacementStrength * 10.0;
    }

    // 5.5 High-frequency chop
    float chop = snoise(worldPosition.xz * 2.0 + uTime * 0.5) * 0.1 * uWaveHeight * smoothstep(0.0, 0.5, uWaveHeight);

    // 6. Vertex-based ripple impacts
    float vertex_ripple_displacement = 0.0;
    if (uUseVertexImpacts && uVertexImpactCount > 0) {
        for (int i = 0; i < MAX_IMPACTS; i++) {
            if (i >= uVertexImpactCount) break;
            vec4 impact = uVertexImpacts[i];
            float age = uTime - impact.w;
            if (age > 0.0 && age < 5.0) {
                float dist = distance(worldPosition.xz, impact.xy);
                
                float speed = 30.0;
                float frequency = 0.2;
                
                float wave = sin(dist * frequency - age * speed);
                
                float pulse_width = 15.0;
                float pulse_envelope = smoothstep(0.0, pulse_width, dist - age * speed) * (1.0 - smoothstep(pulse_width, pulse_width + 1.0, dist - age * speed));
                
                float falloff_time = 1.0 - smoothstep(2.0, 4.0, age);
                
                vertex_ripple_displacement += wave * pulse_envelope * impact.z * falloff_time * 5.0;
            }
        }
    }

    // 7. Apply dampening and combine all displacements
    float procedural_displacement = (main_displacement * fbm_dampening) + small_waves;
    float ripple_displacement = ripple_height * 5.0; // Use a sensible default value
    float total_displacement = procedural_displacement + ripple_displacement + texture_displacement + vertex_ripple_displacement + chop;
    pos.y += clamp(total_displacement, -50.0, 50.0); // Clamp to prevent extreme values and flickering

    vElevation = pos.y;
    vec4 finalWorldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = finalWorldPos.xyz;

    // Normal calculation
    vNormal = calculateTotalNormal(worldPosition.xz, uv);
    
    vec4 mvPosition = viewMatrix * finalWorldPos;
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;
