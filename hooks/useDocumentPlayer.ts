'use client';

import { useReducer, useCallback } from 'react';
import type { Scene } from '@/types/document';

export type PlayerState = 'idle' | 'ready' | 'playing' | 'paused' | 'transitioning' | 'completed';
export type PlaybackSpeed = 0.75 | 1.0 | 1.25 | 1.5 | 2.0;

interface PlayerStoreState {
  playerState: PlayerState;
  currentSceneIndex: number;
  narrationEnabled: boolean;
  speed: PlaybackSpeed;
  narrationProgress: number;
  scenes: Scene[];
  qaOpen: boolean;
}

type PlayerAction =
  | { type: 'LOAD'; scenes: Scene[] }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GO_TO'; index: number }
  | { type: 'SCENE_END' }
  | { type: 'TRANSITION_END' }
  | { type: 'SET_SPEED'; speed: PlaybackSpeed }
  | { type: 'TOGGLE_NARRATION' }
  | { type: 'SET_PROGRESS'; pct: number }
  | { type: 'TOGGLE_QA' }
  | { type: 'CLOSE_QA' };

function reducer(state: PlayerStoreState, action: PlayerAction): PlayerStoreState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, scenes: action.scenes, playerState: 'ready', currentSceneIndex: 0 };

    case 'PLAY':
      return { ...state, playerState: 'playing' };

    case 'PAUSE':
      return { ...state, playerState: 'paused' };

    case 'RESUME':
      return { ...state, playerState: 'playing' };

    case 'NEXT': {
      if (state.currentSceneIndex >= state.scenes.length - 1) {
        return { ...state, playerState: 'completed' };
      }
      return {
        ...state,
        playerState: 'transitioning',
        currentSceneIndex: state.currentSceneIndex + 1,
        narrationProgress: 0,
      };
    }

    case 'PREV': {
      const prevIndex = Math.max(0, state.currentSceneIndex - 1);
      return {
        ...state,
        playerState: 'transitioning',
        currentSceneIndex: prevIndex,
        narrationProgress: 0,
      };
    }

    case 'GO_TO':
      return {
        ...state,
        playerState: 'transitioning',
        currentSceneIndex: action.index,
        narrationProgress: 0,
      };

    case 'SCENE_END':
      return state.currentSceneIndex >= state.scenes.length - 1
        ? { ...state, playerState: 'completed' }
        : { ...state, playerState: 'transitioning', currentSceneIndex: state.currentSceneIndex + 1, narrationProgress: 0 };

    case 'TRANSITION_END':
      return { ...state, playerState: 'playing' };

    case 'SET_SPEED':
      return { ...state, speed: action.speed };

    case 'TOGGLE_NARRATION':
      return { ...state, narrationEnabled: !state.narrationEnabled };

    case 'SET_PROGRESS':
      return { ...state, narrationProgress: action.pct };

    case 'TOGGLE_QA':
      return { ...state, qaOpen: !state.qaOpen };

    case 'CLOSE_QA':
      return { ...state, qaOpen: false };

    default:
      return state;
  }
}

const initial: PlayerStoreState = {
  playerState: 'idle',
  currentSceneIndex: 0,
  narrationEnabled: true,
  speed: 1.0,
  narrationProgress: 0,
  scenes: [],
  qaOpen: false,
};

export function useDocumentPlayer() {
  const [state, dispatch] = useReducer(reducer, initial);

  const load = useCallback((scenes: Scene[]) => dispatch({ type: 'LOAD', scenes }), []);
  const play = useCallback(() => dispatch({ type: 'PLAY' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const goTo = useCallback((index: number) => dispatch({ type: 'GO_TO', index }), []);
  const onSceneEnd = useCallback(() => dispatch({ type: 'SCENE_END' }), []);
  const onTransitionEnd = useCallback(() => dispatch({ type: 'TRANSITION_END' }), []);
  const setSpeed = useCallback((speed: PlaybackSpeed) => dispatch({ type: 'SET_SPEED', speed }), []);
  const toggleNarration = useCallback(() => dispatch({ type: 'TOGGLE_NARRATION' }), []);
  const setProgress = useCallback((pct: number) => dispatch({ type: 'SET_PROGRESS', pct }), []);
  const toggleQA = useCallback(() => dispatch({ type: 'TOGGLE_QA' }), []);
  const closeQA = useCallback(() => dispatch({ type: 'CLOSE_QA' }), []);

  return {
    ...state,
    currentScene: state.scenes[state.currentSceneIndex] ?? null,
    load,
    play,
    pause,
    resume,
    next,
    prev,
    goTo,
    onSceneEnd,
    onTransitionEnd,
    setSpeed,
    toggleNarration,
    setProgress,
    toggleQA,
    closeQA,
  };
}
