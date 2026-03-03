

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';

// Generates a high-quality sand noise texture
export const createSandTexture = (): THREE.Texture | null => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if(!ctx) return null;

    // Fill base
    ctx.fillStyle = '#808080';
    ctx.fillRect(0,0,256,256);

    const imgData = ctx.getImageData(0,0,256,256);
    const data = imgData.data;

    for(let i=0; i<data.length; i+=4) {
        // High frequency noise
        const grain = (Math.random() - 0.5) * 40;
        // Occasional larger specks (shells/rocks)
        const speck = Math.random() > 0.98 ? (Math.random() > 0.5 ? 60 : -60) : 0;
        
        const val = 128 + grain + speck;
        data[i] = val;     // R
        data[i+1] = val;   // G
        data[i+2] = val;   // B
        data[i+3] = 255;   // A
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 16;
    return tex;
};