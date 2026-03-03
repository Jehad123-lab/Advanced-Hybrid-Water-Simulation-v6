/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const underwaterVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const underwaterFragmentShader = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec3 uFogColor;
uniform float uDimmingFactor;
uniform float uTime;
uniform float uCameraNear;
uniform float uCameraFar;
uniform bool uSplitView;
uniform float uWaterLevel;
uniform float uFogCutoffStart;
uniform float uFogCutoffEnd;

varying vec2 vUv;

float readDepth( sampler2D depthSampler, vec2 coord ) {
	float fragCoordZ = texture2D( depthSampler, coord ).x;
	float viewZ = uCameraFar * uCameraNear / ( uCameraFar - ( uCameraFar - uCameraNear ) * fragCoordZ );
	return viewZ;
}

void main() {
    vec4 sceneColor = texture2D(tDiffuse, vUv);
    
    // In split view, don't apply any effects to the top half of the screen
    if (uSplitView && vUv.y > uWaterLevel) {
        gl_FragColor = sceneColor;
        return;
    }
    
    float depth = readDepth( tDepth, vUv );
    
    // Dim the scene color before applying fog
    vec3 dimmedSceneColor = sceneColor.rgb * (1.0 - uDimmingFactor);
    
    // Gradient cutoff fog
    float fogFactor = smoothstep(uFogCutoffStart, uFogCutoffEnd, depth);
    
    vec3 finalColor = mix(dimmedSceneColor, uFogColor, fogFactor);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;