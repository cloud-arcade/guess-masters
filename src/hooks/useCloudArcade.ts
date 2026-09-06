/**
 * CloudArcade Platform Integration Hook
 *
 * Wraps the postMessage protocol and exposes connection state plus the result
 * of the most recent score submission, so the results screen can report whether
 * a run actually made it to the leaderboard.
 *
 * The game is fully playable standalone: when no parent responds to GAME_READY,
 * `isConnected` stays false and every send is a harmless no-op into the void.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface CloudArcadeOptions {
  debug?: boolean;
}

interface UserInfo {
  userId?: string;
  guestId?: string;
  guestName?: string;
  gameId: string;
}

interface Session {
  id: string;
  gameId: string;
  userId?: string;
  guestId?: string;
  startedAt: string;
  endedAt?: string;
}

interface ScorePayload {
  score: number;
  metadata?: Record<string, unknown>;
  checksum?: string;
}

type GameToParentMessage =
  | { type: 'GAME_READY' }
  | { type: 'START_SESSION'; payload?: { metadata?: Record<string, unknown> } }
  | { type: 'END_SESSION'; payload?: { metadata?: Record<string, unknown> } }
  | { type: 'SUBMIT_SCORE'; payload: ScorePayload }
  | { type: 'GAME_OVER'; payload?: { score?: number; endSession?: boolean; metadata?: Record<string, unknown> } }
  | { type: 'GAME_ERROR'; payload: string };

type ParentToGameMessage =
  | { type: 'USER_INFO'; payload: UserInfo }
  | { type: 'SESSION_STARTED'; payload: { sessionId: string; session: Session } }
  | { type: 'SESSION_ENDED'; payload: { session: Session } }
  | { type: 'SCORE_SUBMITTED'; payload: { score: object; rank?: number } }
  | { type: 'SCORE_ERROR'; payload: { error: string } };

export type ScoreState = 'idle' | 'pending' | 'ok' | 'error';

export function useCloudArcade(options: CloudArcadeOptions = {}) {
  const { debug = false } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [scoreState, setScoreState] = useState<ScoreState>('idle');
  const [lastRank, setLastRank] = useState<number | undefined>(undefined);
  const sessionIdRef = useRef<string | null>(null);

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) console.log('[CloudArcade]', ...args);
    },
    [debug]
  );

  const sendMessage = useCallback(
    (message: GameToParentMessage) => {
      log('Sending:', message);
      // Standalone (no parent frame) is a supported mode, so this is safe.
      window.parent.postMessage(message, '*');
    },
    [log]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as ParentToGameMessage;
      if (!data || typeof data !== 'object' || !('type' in data)) return;

      log('Received:', data);

      switch (data.type) {
        case 'USER_INFO':
          setIsConnected(true);
          setUserId(data.payload.userId ?? data.payload.guestId ?? null);
          break;

        case 'SESSION_STARTED':
          sessionIdRef.current = data.payload.sessionId;
          break;

        case 'SESSION_ENDED':
          sessionIdRef.current = null;
          break;

        case 'SCORE_SUBMITTED':
          setScoreState('ok');
          setLastRank(data.payload.rank);
          break;

        case 'SCORE_ERROR':
          console.error('Score error:', data.payload.error);
          setScoreState('error');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    sendMessage({ type: 'GAME_READY' });

    return () => window.removeEventListener('message', handleMessage);
  }, [log, sendMessage]);

  const startSession = useCallback(
    (metadata?: Record<string, unknown>) => {
      setScoreState('idle');
      setLastRank(undefined);
      sendMessage({ type: 'START_SESSION', payload: metadata ? { metadata } : undefined });
    },
    [sendMessage]
  );

  const endSession = useCallback(
    (metadata?: Record<string, unknown>) => {
      sendMessage({ type: 'END_SESSION', payload: metadata ? { metadata } : undefined });
    },
    [sendMessage]
  );

  const submitScore = useCallback(
    (score: number, metadata?: Record<string, unknown>) => {
      setScoreState('pending');
      sendMessage({ type: 'SUBMIT_SCORE', payload: { score, metadata } });
    },
    [sendMessage]
  );

  const gameOver = useCallback(
    (score?: number, endSessionToo = true, metadata?: Record<string, unknown>) => {
      sendMessage({ type: 'GAME_OVER', payload: { score, endSession: endSessionToo, metadata } });
    },
    [sendMessage]
  );

  const reportError = useCallback(
    (message: string) => {
      sendMessage({ type: 'GAME_ERROR', payload: message });
    },
    [sendMessage]
  );

  return {
    isConnected,
    userId,
    scoreState,
    lastRank,
    startSession,
    endSession,
    submitScore,
    gameOver,
    reportError,
  };
}
