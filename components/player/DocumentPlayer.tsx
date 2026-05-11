'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentPlayer } from '@/hooks/useDocumentPlayer';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useQAChat } from '@/hooks/useQAChat';
import { getOrCreateSessionId } from '@/lib/session';
import type { DocumentWithScenes } from '@/types/document';

import { TransitionWrapper } from './TransitionWrapper';
import { SceneRenderer } from './SceneRenderer';
import { NarrationController } from './NarrationController';
import { ProgressBar } from './ProgressBar';
import { PlaybackControls } from './PlaybackControls';
import { SceneThumbnailRail } from './SceneThumbnailRail';
import { QAPanel } from '@/components/qa/QAPanel';

interface DocumentPlayerProps {
  doc: DocumentWithScenes;
}

function getActiveSentence(script: string, progressPct: number): string {
  if (progressPct <= 0 || !script) return '';
  const charIdx = Math.floor((progressPct / 100) * script.length);
  const parts = script.split(/(?<=[.!?])\s+/);
  let pos = 0;
  for (const part of parts) {
    pos += part.length + 1;
    if (pos > charIdx) return part.trim();
  }
  return parts[parts.length - 1]?.trim() ?? '';
}

export function DocumentPlayer({ doc }: DocumentPlayerProps) {
  const player = useDocumentPlayer();
  const { trackEvent } = useAnalytics(doc.id);
  const [sessionId] = useState<string>(() =>
    typeof window !== 'undefined' ? getOrCreateSessionId() : ''
  );
  const qa = useQAChat(doc.id, sessionId);

  const sceneEnteredAtRef = useRef<number>(Date.now());
  const [showSubtitles, setShowSubtitles] = useState(false);

  useEffect(() => {
    player.load(doc.scenes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  useEffect(() => {
    if (player.scenes.length === 0) return;
    sceneEnteredAtRef.current = Date.now();
    trackEvent({
      event_type: 'scene_entered',
      scene_index: player.currentSceneIndex,
      payload: { entry_method: 'auto_advance' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentSceneIndex]);

  useEffect(() => {
    if (player.playerState === 'completed') {
      trackEvent({
        event_type: 'document_completed',
        scene_index: null,
        payload: { total_time_s: Math.round((Date.now() - sceneEnteredAtRef.current) / 1000) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playerState]);

  const handleSceneExit = (exitMethod: 'auto_advance' | 'manual_skip_forward' | 'manual_skip_back') => {
    const timeSpent = Math.round((Date.now() - sceneEnteredAtRef.current) / 1000);
    trackEvent({
      event_type: 'scene_exited',
      scene_index: player.currentSceneIndex,
      payload: { time_spent_s: timeSpent, narration_progress_pct: player.narrationProgress, exit_method: exitMethod },
    });
  };

  const handleNext = () => { handleSceneExit('manual_skip_forward'); player.next(); };
  const handlePrev = () => { handleSceneExit('manual_skip_back'); player.prev(); };
  const handleGoTo = (i: number) => {
    const method = i > player.currentSceneIndex ? 'manual_skip_forward' : 'manual_skip_back';
    handleSceneExit(method);
    player.goTo(i);
    trackEvent({ event_type: 'scene_entered', scene_index: i, payload: { entry_method: 'manual_click' } });
  };

  const handleNarrationEnd = () => {
    handleSceneExit('auto_advance');
    player.onSceneEnd();
  };

  const handleQAToggle = () => {
    if (!player.qaOpen) {
      trackEvent({ event_type: 'qa_panel_opened', scene_index: player.currentSceneIndex, payload: {} });
    }
    player.toggleQA();
  };

  const currentScene = player.currentScene;
  const sceneDurations = player.scenes.map((s) => s.estimated_duration_s ?? 60);
  const subtitle = showSubtitles && currentScene
    ? getActiveSentence(currentScene.narration_script, player.narrationProgress)
    : '';

  if (player.playerState === 'idle' || !currentScene) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-neutral-950 truncate">{doc.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-neutral-400 tabular-nums">
            Scene {player.currentSceneIndex + 1} / {player.scenes.length}
          </span>
          <Button variant="outline" size="sm" onClick={handleQAToggle} className="gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            Ask
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Player area — relative so the subtitle overlay can be positioned inside */}
        <div className="flex-1 relative overflow-hidden">
          <TransitionWrapper
            sceneKey={player.currentSceneIndex}
            onAnimationComplete={() => {
              if (player.playerState === 'transitioning') player.onTransitionEnd();
            }}
          >
            <SceneRenderer
              scene={currentScene}
              narrationProgress={player.narrationProgress}
            />
          </TransitionWrapper>

          <CalloutOverlay
            callouts={currentScene.callouts}
            elapsedSeconds={elapsedSeconds}
            active={player.playerState === 'playing'}
          />

          {/* YouTube-style subtitle — hugs text, doesn't span full width */}
          {showSubtitles && subtitle && (
            <div className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none px-8">
              <span
                className="inline-block max-w-[72%] text-center text-[13px] text-white font-medium leading-snug rounded px-3 py-1.5"
                style={{ backgroundColor: 'rgba(0,0,0,0.78)' }}
              >
                {subtitle}
              </span>
            </div>
          )}
        </div>

        {/* Key claims sidebar */}
        <div className="hidden md:flex w-64 border-l border-neutral-100 flex-col gap-4 p-5 overflow-y-auto shrink-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3">Key Points</p>
            {currentScene.key_claims.length === 0 ? (
              <p className="text-xs text-neutral-300">No key claims for this scene.</p>
            ) : (
              <ul className="space-y-2">
                {currentScene.key_claims.map((claim, i) => (
                  <li key={i} className="text-xs text-neutral-600 leading-relaxed flex gap-2">
                    <span className="text-neutral-300 mt-0.5 shrink-0">●</span>
                    <span>{claim.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Q&A Panel */}
        <QAPanel
          open={player.qaOpen}
          onClose={player.closeQA}
          qa={qa}
          currentSceneIndex={player.currentSceneIndex}
          currentSceneTitle={currentScene.title}
          onQuestionAsked={(q) => {
            trackEvent({
              event_type: 'qa_question_asked',
              scene_index: player.currentSceneIndex,
              payload: { question_length_chars: q.length, response_time_ms: 0 },
            });
          }}
        />
      </div>

      {/* Footer controls */}
      <div className="border-t border-neutral-100 px-6 py-4 space-y-3 shrink-0">
        <ProgressBar
          current={player.currentSceneIndex}
          total={player.scenes.length}
          narrationProgress={player.narrationProgress}
          sceneDurations={sceneDurations}
          onSeek={handleGoTo}
        />
        <div className="flex items-center justify-between">
          <PlaybackControls
            playerState={player.playerState}
            narrationEnabled={player.narrationEnabled}
            speed={player.speed}
            canPrev={player.currentSceneIndex > 0}
            canNext={player.currentSceneIndex < player.scenes.length - 1}
            showSubtitles={showSubtitles}
            onPlay={player.play}
            onPause={player.pause}
            onResume={player.resume}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleNarration={player.toggleNarration}
            onSetSpeed={player.setSpeed}
            onToggleSubtitles={() => setShowSubtitles((v) => !v)}
          />
          <SceneThumbnailRail
            scenes={player.scenes}
            currentIndex={player.currentSceneIndex}
            onSelect={handleGoTo}
          />
        </div>
      </div>

      {/* Hidden narration controller */}
      {currentScene && (
        <NarrationController
          script={currentScene.narration_script}
          playerState={player.playerState}
          speed={player.speed}
          narrationEnabled={player.narrationEnabled}
          onProgress={player.setProgress}
          onEnd={handleNarrationEnd}
        />
      )}
    </div>
  );
}
