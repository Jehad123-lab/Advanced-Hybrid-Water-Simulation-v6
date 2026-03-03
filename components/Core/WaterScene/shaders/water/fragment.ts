

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from '../common.ts';

export const waterFragmentShader = `
${commonShaderUtils}
uniform vec3 uColorDeep;
uniform vec3 uColorShallow;
uniform vec3 uSunPosition;
uniform float uTransparency;
uniform float uRoughness;
uniform float uSunIntensity;
uniform float uNormalFlatness;
uniform float uIOR;
uniform sampler2D tSky;
uniform sampler2D tRipple;
uniform vec2 uResolution;
uniform float uTime;
uniform float uWaveHeight;
uniform bool uDebugNormals;
uniform bool uSmoothNormalScroll;

// Normal Map Uniforms
uniform bool uUseTextureNormals;
uniform sampler2D tNormalMap;
uniform float uNormalMapScale;
uniform float uNormalMapSpeed;
uniform float uNormalMapStrength;

// Secondary Normal Map (Chop)
uniform bool uUseSecondaryNormals;
uniform sampler2D tSecondaryNormalMap;
uniform float uSecondaryNormalMapScale;
uniform float uSecondaryNormalMapSpeed;
uniform float uSecondaryNormalMapStrength;

// Specular
uniform float uSpecularIntensity;
uniform float uSpecularSharpness;

// Surface Texture (Foam) Uniforms
uniform bool uUseTextureSurface;
uniform sampler2D tSurfaceMap;
uniform vec3 uFoamColor;
uniform float uSurfaceTextureScale;
uniform float uSurfaceTextureSpeed;
uniform float uSurfaceTextureStrength;

// Color Ramp Uniforms
uniform bool uUseColorRamp;
uniform vec3 uColorRamp[5];
uniform float uColorRampPositions[5];
uniform int uColorRampStopCount;
uniform int uColorRampNoiseType;
uniform float uColorRampNoiseScale;
uniform float uColorRampNoiseSpeed;
uniform float uColorRampNoiseMix;

varying vec3 vWorldPos;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vElevation;

// Equirectangular mapping for fake reflection/refraction
vec3 getSkyColor(vec3 dir) {
    // Standard Equirectangular mapping
    vec2 uv = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
    uv *= vec2(0.1591, 0.3183); // inv(2*PI), inv(PI)
    uv += 0.5;
    return texture2D(tSky, uv).rgb;
}

float getProceduralNoiseValue(int noiseType, vec2 p, float speed) {
    vec2 pos = p + vec2(uTime * speed * 0.5, uTime * speed * 0.5 * 0.4);
    
    if (noiseType == 0) { // Simplex FBM
        return simplex_fbm(pos, 2, 0.5, 2.0);
    } else if (noiseType == 1) { // Perlin FBM
        return perlin_fbm(pos, 2, 0.5, 2.0);
    } else if (noiseType == 2) { // Voronoi
        return (voronoi(pos * 0.5, uTime * speed) * 2.0 - 1.0);
    }
    return 0.0;
}

vec3 getColorFromRamp(float t) {
    if (t <= uColorRampPositions[0]) return uColorRamp[0];

    for (int i = 0; i < 4; ++i) {
        if (i + 1 >= uColorRampStopCount) break; // Don't read past the active stops
        float pos1 = uColorRampPositions[i];
        float pos2 = uColorRampPositions[i+1];
        if (t > pos1 && t <= pos2) {
            float blend = (t - pos1) / (pos2 - pos1);
            return mix(uColorRamp[i], uColorRamp[i+1], blend);
        }
    }

    return uColorRamp[uColorRampStopCount - 1];
}

void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = vNormal;

    if (uUseTextureNormals && uNormalMapStrength > 0.0) {
        // Add watery distortion to UVs
        vec2 dist_uv = vWorldPos.xz * 0.02 * uNormalMapScale; 
        float distortion = snoise(vec3(dist_uv, uTime * uNormalMapSpeed * 0.2)) * 0.2;

        // Scrolling UVs
        vec2 base_uv = vWorldPos.xz * 0.1 * uNormalMapScale;
        
        vec2 uv1, uv2;
        if (uSmoothNormalScroll) {
            // Smoother scrolling using noise-based flow distortion
            float flow = snoise(vec3(vWorldPos.xz * 0.01, uTime * 0.1)) * 0.5 + 0.5;
            uv1 = base_uv + vec2(uTime * uNormalMapSpeed * 0.8, uTime * uNormalMapSpeed * 0.3) + distortion * flow;
            uv2 = base_uv * 0.8 - vec2(uTime * uNormalMapSpeed * 0.5, uTime * uNormalMapSpeed * 0.7) - distortion * (1.0 - flow);
        } else {
            uv1 = base_uv + distortion + vec2(uTime * uNormalMapSpeed, uTime * uNormalMapSpeed * 0.4);
            uv2 = base_uv * 0.7 - distortion - vec2(uTime * uNormalMapSpeed * 0.6, uTime * uNormalMapSpeed);
        }
        
        // Sample and unpack tangent-space normals
        vec3 normal1 = texture2D(tNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 normal2 = texture2D(tNormalMap, uv2).rgb * 2.0 - 1.0;
        
        // Blend texture normals
        vec3 texNormal = normalize(normal1 + normal2);

        // Create TBN matrix from the procedural world-space normal
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), normal));
        vec3 bitangent = normalize(cross(normal, tangent));
        mat3 tbn = mat3(tangent, bitangent, normal);

        // Transform tangent-space normal to world space
        vec3 worldTexNormal = normalize(tbn * texNormal);

        // Blend procedural and texture-based normals
        normal = normalize(mix(normal, worldTexNormal, uNormalMapStrength));
    }

    if (uUseSecondaryNormals) {
        vec2 uv3 = vWorldPos.xz * 0.5 * uSecondaryNormalMapScale + vec2(uTime * uSecondaryNormalMapSpeed, -uTime * uSecondaryNormalMapSpeed * 0.7);
        vec3 secondaryNormal = texture2D(tSecondaryNormalMap, uv3).xyz * 2.0 - 1.0;
        
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), normal));
        vec3 bitangent = normalize(cross(normal, tangent));
        mat3 tbn = mat3(tangent, bitangent, normal);
        vec3 worldSecondaryNormal = normalize(tbn * secondaryNormal);

        normal = normalize(mix(normal, worldSecondaryNormal, uSecondaryNormalMapStrength));
    }
    
    // Apply normal flatness
    normal.xz *= (1.0 - uNormalFlatness * 0.01); 
    normal = normalize(normal);
    
    // Correct normal for backfaces
    vec3 faceNormal = normalize(gl_FrontFacing ? normal : -normal);
    
    float NdotV = max(0.0, dot(faceNormal, viewDir));
    float fresnel = pow(1.0 - NdotV, 5.0); 
    vec3 finalColor;

    if (gl_FrontFacing) {
        // --- SURFACE (Looking Down) ---
        vec3 refDir = reflect(viewDir, faceNormal);
        
        // Sample HDR Skybox for Reflection
        vec3 reflection = getSkyColor(refDir);
        
        vec3 baseBodyColor = mix(uColorDeep, uColorShallow, 0.2 + 0.3 * NdotV);
        vec3 body = baseBodyColor;

        if (uUseColorRamp) {
            vec2 noisePos = vWorldPos.xz * uColorRampNoiseScale * 0.02;
            float noiseVal = getProceduralNoiseValue(uColorRampNoiseType, noisePos, uColorRampNoiseSpeed);
            float rampT = noiseVal * 0.5 + 0.5; // Map from [-1, 1] to [0, 1]
            
            vec3 rampColor = getColorFromRamp(rampT);
            body = mix(baseBodyColor, rampColor, uColorRampNoiseMix);
        }

        vec3 sunDir = normalize(uSunPosition);
        vec3 halfVec = normalize(sunDir + viewDir);
        float NdotH = max(0.0, dot(faceNormal, halfVec));
        float specular = pow(NdotH, uSpecularSharpness) * uSpecularIntensity;
        
        // Mix reflection with water body
        finalColor = mix(body, reflection, fresnel);
        finalColor += specular * vec3(1.0, 0.95, 0.8) * uSunIntensity * (1.0 - fresnel);
        
        // --- FOAM LOGIC ---
        if (uUseTextureSurface && uSurfaceTextureStrength > 0.0) {
            // 1. Procedural foam based on wave crests and velocity
            float crestFactor = smoothstep(uWaveHeight * 0.7, uWaveHeight * 1.2, vElevation);
            float velocity = texture2D(tRipple, gl_FragCoord.xy / uResolution).g;
            float turbulence = smoothstep(0.0, 0.1, abs(velocity));
            float proceduralFoam = (crestFactor + turbulence) * 0.5;

            // 2. Texture-based foam pattern
            vec2 uv1 = vWorldPos.xz * 0.1 * uSurfaceTextureScale + vec2(uTime * uSurfaceTextureSpeed, 0.0);
            vec2 uv2 = vWorldPos.xz * 0.13 * uSurfaceTextureScale - vec2(0.0, uTime * uSurfaceTextureSpeed * 0.8);
            float foamPattern = texture2D(tSurfaceMap, uv1).r * texture2D(tSurfaceMap, uv2).g;

            // 3. Combine and apply
            float foamAmount = proceduralFoam * foamPattern * uSurfaceTextureStrength;
            finalColor = mix(finalColor, uFoamColor, foamAmount);
        }

        if (uDebugNormals) {
            // Visualize normals in tangent-space-like colors (purplish-blue)
            // World up (0,1,0) should map to (0.5, 0.5, 1.0)
            vec3 debugNormal = vec3(normal.x * 0.5 + 0.5, normal.z * 0.5 + 0.5, normal.y * 0.5 + 0.5);
            gl_FragColor = vec4(debugNormal, 1.0);
            return;
        }

        gl_FragColor = vec4(finalColor, uTransparency);
    } else {
        // --- UNDERWATER (Looking Up) ---
        vec3 I = viewDir;
        vec3 N = faceNormal;
        float eta = 1.0 / uIOR; // Water to Air

        vec3 refractedDir = refract(I, N, eta);
        
        float R0 = pow((1.0 - uIOR) / (1.0 + uIOR), 2.0);
        float cosTheta = max(0.0, dot(I, N));
        float fresnelFactor = R0 + (1.0 - R0) * pow(1.0 - cosTheta, 5.0);
        
        vec3 refractedColor;
        if (length(refractedDir) > 0.0) {
            refractedColor = getSkyColor(refractedDir);
        } else {
            refractedColor = vec3(0.0);
        }

        vec3 reflectedDir = reflect(I, N);
        float noise = simplex_fbm(vWorldPos.xz * 0.05 + reflectedDir.xz * 0.1 + uTime * 0.1, 3, 0.5, 2.0);
        vec3 reflectedColor = mix(uColorDeep, uColorShallow, 0.3 + noise * 0.3);
        
        float k = 1.0 - eta * eta * (1.0 - cosTheta * cosTheta);
        float finalFresnel = k < 0.0 ? 1.0 : fresnelFactor;

        finalColor = mix(refractedColor, reflectedColor, finalFresnel);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
}
`;