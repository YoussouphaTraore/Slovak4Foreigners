import { useState, useRef } from 'react';
import type { ConversationListenExercise as TExercise } from '../../types/conversationComprehension';

interface Props {
  exercise: TExercise;
  onDone: (correct: boolean) => void;
}

function SpeakerAvatar({ avatar, name }: { avatar: string; name: string }) {
  const isUrl = avatar.startsWith('/') || avatar.startsWith('http');
  return (
    <div className="flex flex-col items-center gap-1.5">
      {isUrl ? (
        <img src={avatar} alt={name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
      ) : (
        <div className="w-14 h-14 rounded-full border-2 border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center text-3xl select-none">
          {avatar}
        </div>
      )}
      <span className="text-xs font-medium text-gray-500">{name}</span>
    </div>
  );
}

export function ConversationListenExercise({ exercise, onDone }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAudio = Boolean(exercise.audioUrl);

  const [hasCompletedPlay, setHasCompletedPlay] = useState(!hasAudio);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {hasAudio && (
        <audio
          ref={audioRef}
          src={exercise.audioUrl}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => { setIsPlaying(false); setHasCompletedPlay(true); }}
        />
      )}

      {exercise.coverImage && (
        <div className="flex-none">
          <img src={exercise.coverImage} alt="" className="w-full rounded-3xl object-cover max-h-44" />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <p className="text-base font-semibold text-gray-600 text-center px-4">
          {hasAudio
            ? 'Listen to the conversation, then answer questions about it.'
            : 'Read the transcript and answer the questions below.'}
        </p>

        {exercise.speakers.length > 0 && (
          <div className="flex items-center gap-6 justify-center">
            {exercise.speakers.map((s) => (
              <SpeakerAvatar key={s.name} avatar={s.avatar} name={s.name} />
            ))}
          </div>
        )}

        {hasAudio ? (
          <>
            <button
              type="button"
              onClick={handlePlayPause}
              className="w-20 h-20 rounded-full bg-brand-green text-white flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            {!hasCompletedPlay && (
              <p className="text-xs text-gray-400 text-center">
                Listen to the full conversation before continuing
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-2xl">🎧</span>
            <p className="text-sm font-semibold text-amber-700 text-center">Audio coming soon</p>
            <p className="text-xs text-amber-600 text-center">
              Read the transcript and answer the questions below.
            </p>
          </div>
        )}

        {exercise.conversationTranscriptSk && !hasAudio && (
          <div className="w-full px-4 py-4 bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Transcript</p>
            <p className="text-sm text-gray-700 leading-relaxed">{exercise.conversationTranscriptSk}</p>
          </div>
        )}
      </div>

      <div className="flex-none pb-1">
        <button
          type="button"
          disabled={!hasCompletedPlay}
          onClick={() => onDone(true)}
          className={`w-full font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest transition-all ${
            hasCompletedPlay
              ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] shadow-md cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
