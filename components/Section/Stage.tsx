

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { WaterConfig } from '../../types/index.tsx';
// FIX: Corrected the import path for the WaterScene component.
import WaterScene from '../Core/WaterScene/index.tsx';
import { SceneController } from '../App/MetaPrototype.tsx';

interface StageProps {
  waterConfig: WaterConfig;
  sceneController: React.MutableRefObject<Partial<SceneController>>;
  isSplitView: boolean;
  mouseHoverEnabled: boolean;
}

const Stage: React.FC<StageProps> = ({ 
    waterConfig,
    sceneController,
    isSplitView,
    mouseHoverEnabled,
}) => {
  return (
    <WaterScene config={waterConfig} sceneController={sceneController} isSplitView={isSplitView} mouseHoverEnabled={mouseHoverEnabled} />
  );
};

export default Stage;