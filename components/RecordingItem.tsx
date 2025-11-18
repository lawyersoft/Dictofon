import React, { useState, useRef, useEffect } from 'react';
import { Recording, TranscriptionStatus } from '../types';
import { formatDuration, formatTimestamp } from '../utils/audioUtils';
import { Play, Pause, FileText, Trash2, Loader2, Copy, Check } from 'lucide-react';

interface RecordingItemProps {
  recording: Recording;
  onTranscribe: (id: string) => void;
  onDelete: (id: string) => void;
}

const RecordingItem: React.FC<RecordingItemProps> = ({ recording, onTranscribe, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(recording.url);
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
        }
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [recording.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTranscribe = () => {
    if (recording.status === TranscriptionStatus.IDLE || recording.status === TranscriptionStatus.ERROR) {
      onTranscribe(recording.id);
    }
  };

  const handleCopy = async () => {
    if (recording.transcript) {
      await navigator.clipboard.writeText(recording.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg transition-all hover:border-slate-600 hover:shadow-xl">
      
      {/* Header: Name/Timestamp & Duration */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-slate-200 font-medium text-lg truncate max-w-[250px] sm:max-w-md">
             {recording.name || formatTimestamp(recording.timestamp)}
          </span>
          <div className="flex items-center gap-2">
            {recording.name && (
                <span className="text-slate-500 text-xs">
                    {formatTimestamp(recording.timestamp)}
                </span>
            )}
            <span className={`text-slate-400 text-sm font-mono ${recording.name ? 'pl-2 border-l border-slate-700' : ''}`}>
                {formatDuration(recording.duration)}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={() => onDelete(recording.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                title="Удалить"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Audio Player Control */}
      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
        </button>
        
        <div className="flex-grow h-2 bg-slate-700 rounded-full overflow-hidden relative">
            {/* Progress Bar */}
            <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>

      {/* Transcription Section */}
      <div className="border-t border-slate-700 pt-4">
        
        {/* Action Area (if no transcript yet) */}
        {(recording.status === TranscriptionStatus.IDLE || recording.status === TranscriptionStatus.ERROR) && (
          <div className="flex items-center justify-between">
             <span className="text-slate-400 text-sm">
                {recording.status === TranscriptionStatus.ERROR ? "Ошибка транскрипции." : "Транскрипция отсутствует."}
             </span>
             <button
                onClick={handleTranscribe}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors font-medium"
             >
               <FileText size={16} />
               {recording.status === TranscriptionStatus.ERROR ? "Повторить" : "Расшифровать"}
             </button>
          </div>
        )}

        {/* Loading State */}
        {recording.status === TranscriptionStatus.LOADING && (
          <div className="flex items-center gap-3 text-indigo-400 text-sm animate-pulse">
            <Loader2 size={16} className="animate-spin" />
            <span>Создание транскрипции с помощью Gemini...</span>
          </div>
        )}

        {/* Transcript Result */}
        {recording.status === TranscriptionStatus.SUCCESS && recording.transcript && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Транскрипция</h4>
                <button 
                    onClick={handleCopy}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                    title="Копировать в буфер"
                >
                   {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 max-h-60 overflow-y-auto custom-scrollbar">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-light">
                    {recording.transcript}
                </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingItem;