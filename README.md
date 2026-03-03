# Advanced Hybrid Water Simulation

Added debug normals visualization with tangent-space colors, implemented smooth noise-based normal map scrolling, and refined ripple physics with a gentle impact mode for softer wave propagation.

## Architecture (IPO)
- **Input**: User interaction (mouse/touch), configuration toggles (Debug Normals, Smooth Scroll, Gentle Impact).
- **Process**: Shader-based normal map blending with noise flow, ripple simulation with adjustable falloff curves, world-to-tangent normal mapping for debug view.
- **Output**: Real-time 3D water surface with dynamic ripples and diagnostic visualization.

## Action List
1. Added `debugNormals` to `WaterConfig` and UI.
2. Implemented `uDebugNormals` uniform and fragment shader logic.
3. Enhanced normal map scrolling with `uSmoothNormalScroll` and noise-based flow.
4. Added `uGentleImpact` to ripple simulation for softer wave falloff.
