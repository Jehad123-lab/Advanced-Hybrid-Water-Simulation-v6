/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { commonShaderUtils } from './common.ts';

export const waterDropVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const waterDropFragmentShader = `
uniform sampler2D tDiffuse;
uniform float uTime; // Time since emerging from water
varying vec2 vUv;
${commonShaderUtils}

vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0 * fract(sin(st)*43758.5453123);
}

void main() {
    vec2 uv = vUv;
    float t = uTime;
    
    // Animate effect duration (fade out over 2 seconds)
    float effectAlpha = 1.0 - smoothstep(1.5, 2.0, t);
    if (effectAlpha <= 0.0) {
        gl_FragColor = texture2D(tDiffuse, uv);
        return;
    }

    // Generate random drops
    float totalDistortion = 0.0;
    for (float i = 0.0; i < 20.0; i++) {
        vec2 id = floor(vec2(i / 4.0, mod(i, 4.0)));
        vec2 p = random2(id);
        
        // Drop properties
        float size = mix(0.05, 0.15, random2(id + 1.0).x);
        float speed = mix(0.5, 1.5, random2(id + 2.0).y);
        
        // Initial position + downward motion
        vec2 dropCenter = vec2(p.x, 1.0 + size + p.y) - vec2(0.0, t * speed);
        
        float dist = distance(uv, dropCenter);
        
        if (dist < size) {
            // Refraction distortion based on drop shape
            float ramp = (size - dist) / size;
            vec2 distortion = normalize(uv - dropCenter) * pow(ramp, 2.0) * 0.1;
            uv += distortion * effectAlpha;
        }
    }
    
    vec4 color = texture2D(tDiffuse, uv);
    
    // Add a subtle darkening/blur to the drops
    float blurAmount = totalDistortion * 0.5 * effectAlpha;
    color.rgb *= (1.0 - blurAmount);

    gl_FragColor = color;
}
`;
