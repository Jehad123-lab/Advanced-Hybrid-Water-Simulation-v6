
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const rippleVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const rippleFragmentShader = `
#define MAX_IMPACTS 10

uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uStrength;
uniform float uRadius;
uniform float uDamping;
uniform float uViscosity; // New uniform for viscosity
uniform float uSpeed; // New uniform for speed
uniform bool uMouseDown;
uniform bool uGentleImpact;
uniform vec3 uImpacts[MAX_IMPACTS];
uniform int uImpactCount;
varying vec2 vUv;

void main() {
    vec2 cellSize = 1.0 / uResolution;
    
    // RG = (Height, Velocity)
    vec4 data = texture2D(tDiffuse, vUv);
    float height = data.r;
    float vel = data.g;

    // Sample neighbors for height and velocity
    vec4 n = texture2D(tDiffuse, vUv + vec2(0.0, -cellSize.y));
    vec4 s = texture2D(tDiffuse, vUv + vec2(0.0, cellSize.y));
    vec4 e = texture2D(tDiffuse, vUv + vec2(cellSize.x, 0.0));
    vec4 w = texture2D(tDiffuse, vUv + vec2(-cellSize.x, 0.0));

    // Height Laplacian (for acceleration)
    float laplacian = (n.r + s.r + e.r + w.r) - 4.0 * height;
    
    // Apply speed (clamped for stability)
    float speed = clamp(uSpeed, 0.01, 0.49);
    vel += laplacian * speed; 

    // Velocity Laplacian (for viscosity/damping)
    float vel_laplacian = (n.g + s.g + e.g + w.g) - 4.0 * vel;
    vel += vel_laplacian * uViscosity;

    vel *= uDamping;
    height += vel;

    // Mouse Interaction
    if (uMouseDown) {
        float dist = distance(vUv, uMouse);
        if (dist < uRadius) {
            float falloff = uGentleImpact ? pow(1.0 - smoothstep(0.0, uRadius, dist), 2.0) : (1.0 - smoothstep(0.0, uRadius, dist));
            float amount = uStrength * falloff;
            height -= amount; 
        }
    }
    
    // Discrete Impacts
    float impactForce = 0.0;
    if (uImpactCount > 0) {
        for (int i = 0; i < MAX_IMPACTS; i++) {
            if (i >= uImpactCount) break;
            vec3 impact = uImpacts[i]; 
            float dist = distance(vUv, impact.xy);
            if (dist < uRadius) {
                float falloff = uGentleImpact ? pow(1.0 - smoothstep(0.0, uRadius, dist), 2.0) : (1.0 - smoothstep(0.0, uRadius, dist));
                float amount = impact.z * falloff;
                impactForce -= amount;
            }
        }
    }
    height += impactForce;
    
    gl_FragColor = vec4(height, vel, 0.0, 1.0);
}
`;
