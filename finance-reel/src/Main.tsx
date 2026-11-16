import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import assets from './generated/assets.json';
import {Background} from './components/Background';
import {PAD, SceneWrap, TransitionKind} from './components/SceneWrap';
import {Subtitles} from './components/Subtitles';
import {Cta, CTA_CUES} from './scenes/Cta';
import {HOOK_CUES, Hook} from './scenes/Hook';
import {PAYOFF_CUES, PAYOFF_WORD_CUES, Payoff} from './scenes/Payoff';
import {RELATE_CUES, Relate} from './scenes/Relate';
import {TOOLS_CUES, Tools} from './scenes/Tools';
import {TURN_CUES, Turn} from './scenes/Turn';
import {C, FONT, FPS} from './theme';
import {SceneId, TL, scene, speechIntervals} from './timeline';

const SCENES: {id: SceneId; Comp: React.FC; enter?: TransitionKind; exit?: TransitionKind}[] = [
  {id: 'hook', Comp: Hook, exit: 'whipLeft'},
  {id: 'relate', Comp: Relate, enter: 'whipLeft', exit: 'scaleBlur'},
  {id: 'turn', Comp: Turn, enter: 'scaleBlur', exit: 'whipUp'},
  {id: 'tools', Comp: Tools, enter: 'whipUp', exit: 'scaleBlur'},
  {id: 'payoff', Comp: Payoff, enter: 'scaleBlur', exit: 'whipLeft'},
  {id: 'cta', Comp: Cta, enter: 'whipLeft'},
];

const A = assets as {music: string | null; sfx: {whoosh?: string; pop?: string}};

// SFX cue list (absolute frames): whoosh on scene changes, pop on text slams.
const abs = (id: SceneId, local: number) => scene(id).start + local;
const WHOOSH = SCENES.slice(1).map((s) => scene(s.id).start - PAD);
const POPS = [
  abs('hook', HOOK_CUES.income - 3),
  abs('hook', HOOK_CUES.savings - 2),
  abs('relate', RELATE_CUES.earnMore - 2),
  abs('relate', RELATE_CUES.spendMore - 2),
  abs('relate', RELATE_CUES.coffee - 4),
  abs('relate', RELATE_CUES.install - 4),
  abs('relate', RELATE_CUES.stuff - 4),
  abs('turn', TURN_CUES.shock - 1),
  abs('turn', TURN_CUES.problem - 2),
  abs('tools', TOOLS_CUES.three - 2),
  abs('tools', TOOLS_CUES.noApp),
  abs('tools', TOOLS_CUES.spendAcc - 3),
  abs('tools', TOOLS_CUES.saveAcc - 3),
  abs('tools', TOOLS_CUES.emergAcc - 3),
  abs('tools', TOOLS_CUES.auto - 2),
  abs('tools', TOOLS_CUES.time - 1),
  abs('payoff', PAYOFF_CUES.freedom),
  ...PAYOFF_WORD_CUES.map((c) => abs('payoff', c - 1)),
  abs('cta', CTA_CUES.today - 2),
  abs('cta', CTA_CUES.one + 4),
  abs('cta', CTA_CUES.comment - 2),
];

const dB = (d: number) => Math.pow(10, d / 20);
const MUSIC_BASE = dB(-22);
const DUCK = dB(-8); // extra reduction under the voice

/** 1 when the voice is silent, DUCK while speaking; 150 ms attack / 450 ms release. */
const duckGain = (frame: number) => {
  const ms = (frame / FPS) * 1000;
  let g = 1;
  for (const [s, e] of speechIntervals) {
    if (ms < s - 150 || ms > e + 450) continue;
    const k =
      ms < s ? interpolate(ms, [s - 150, s], [0, 1]) : ms > e ? interpolate(ms, [e, e + 450], [1, 0]) : 1;
    g = Math.min(g, 1 - (1 - DUCK) * k);
  }
  return g;
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{fontFamily: FONT, background: C.navy, color: C.white}}>
    <Background />
    {SCENES.map(({id, Comp, enter, exit}) => {
      const s = scene(id);
      return (
        <Sequence key={id} from={s.start - PAD} durationInFrames={s.dur + PAD * 2} name={id}>
          <SceneWrap dur={s.dur} enter={enter} exit={exit}>
            <Comp />
          </SceneWrap>
        </Sequence>
      );
    })}
    <Subtitles />

    <Audio src={staticFile(TL.voiceFile)} />
    {A.music && (
      <Audio
        src={staticFile(A.music)}
        loop
        volume={(f) => MUSIC_BASE * duckGain(f) * interpolate(f, [0, 20], [0, 1], {extrapolateRight: 'clamp'})}
      />
    )}
    {A.sfx.whoosh &&
      WHOOSH.map((f) => (
        <Sequence key={`w${f}`} from={Math.max(0, f)} durationInFrames={45}>
          <Audio src={staticFile(A.sfx.whoosh!)} volume={dB(-12)} />
        </Sequence>
      ))}
    {A.sfx.pop &&
      POPS.map((f, i) => (
        <Sequence key={`p${i}`} from={Math.max(0, f)} durationInFrames={30}>
          <Audio src={staticFile(A.sfx.pop!)} volume={dB(-16)} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
