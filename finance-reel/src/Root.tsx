import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {Main} from './Main';
import {FPS, H, W} from './theme';
import {TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition id="FinanceReel" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
);
