import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AudioWaveform, Upload, FileAudio } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Recording, TranscriptionStatus } from './types';
import { transcribeAudio } from './services/geminiService';
import { getAudioDuration } from './utils/audioUtils';
import AudioVisualizer from './components/AudioVisualizer';
import RecordingItem from './components/RecordingItem';

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle starting recording
  const startRecording = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const duration = recordingTime; // Approximate duration based on timer

        const newRecording: Recording = {
          id: uuidv4(),
          blob,
          url,
          timestamp: Date.now(),
          duration,
          transcript: null,
          status: TranscriptionStatus.IDLE,
        };

        setRecordings((prev) => [newRecording, ...prev]);
        setRecordingTime(0);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingTime((Date.now() - startTime) / 1000);
      }, 100); // Update frequently for smooth display if needed, but using seconds for state

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionError("Доступ к микрофону запрещен. Пожалуйста, разрешите доступ для записи.");
    }
  };

  // Handle stopping recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Trigger file upload dialog
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const duration = await getAudioDuration(file);
      
      const newRecording: Recording = {
        id: uuidv4(),
        blob: file,
        url: URL.createObjectURL(file),
        timestamp: Date.now(),
        duration: duration,
        transcript: null,
        status: TranscriptionStatus.IDLE,
        name: file.name
      };

      setRecordings((prev) => [newRecording, ...prev]);
    } catch (error) {
      console.error("Error loading file:", error);
      alert("Ошибка при загрузке файла.");
    }

    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Transcription
  const handleTranscribe = async (id: string) => {
    const recording = recordings.find(r => r.id === id);
    if (!recording) return;

    // Update status to LOADING
    setRecordings(prev => prev.map(r => 
      r.id === id ? { ...r, status: TranscriptionStatus.LOADING, error: undefined } : r
    ));

    try {
      const transcript = await transcribeAudio(recording.blob);
      
      // Update with SUCCESS
      setRecordings(prev => prev.map(r => 
        r.id === id ? { 
          ...r, 
          status: TranscriptionStatus.SUCCESS, 
          transcript: transcript 
        } : r
      ));
    } catch (error) {
      // Update with ERROR
      setRecordings(prev => prev.map(r => 
        r.id === id ? { 
          ...r, 
          status: TranscriptionStatus.ERROR, 
          error: "Не удалось транскрибировать." 
        } : r
      ));
    }
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl z-10 flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-indigo-400">
             <AudioWaveform size={32} />
             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
               Gemini Диктофон
             </h1>
          </div>
          <p className="text-slate-400 max-w-md">
            Записывайте свои мысли или загружайте аудиофайлы для мгновенной расшифровки с помощью ИИ.
          </p>
        </header>

        {/* Recorder Section */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 transition-all">
            
            {/* Timer Display */}
            <div className="text-center">
                <span className={`text-5xl font-mono font-light tracking-wider ${isRecording ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'text-slate-600'}`}>
                    {new Date(recordingTime * 1000).toISOString().substr(14, 5)}
                </span>
            </div>

            {/* Visualizer */}
            <AudioVisualizer stream={mediaStream} isRecording={isRecording} />

            {/* Controls */}
            <div className="flex flex-col items-center gap-4 mt-2">
                <div className="flex justify-center items-center gap-6">
                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-95"
                            title="Начать запись"
                        >
                            <div className="absolute inset-0 rounded-full border-2 border-red-400 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                            <Mic size={32} className="text-white" />
                        </button>
                    ) : (
                        <button
                            onClick={stopRecording}
                            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-700 hover:bg-slate-600 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
                            title="Остановить запись"
                        >
                            <Square size={28} fill="currentColor" className="text-slate-200 group-hover:text-white" />
                        </button>
                    )}
                </div>

                {/* File Upload Input (Hidden) */}
                <input 
                    type="file" 
                    accept="audio/*,.mp3,.ogg,.wav,.m4a" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
                
                {!isRecording && (
                    <button 
                        onClick={handleUploadClick}
                        className="text-slate-400 hover:text-indigo-400 text-sm flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all"
                    >
                        <Upload size={16} />
                        <span>Загрузить файл (MP3, OGG)</span>
                    </button>
                )}
            </div>

            {permissionError && (
                <div className="text-center text-red-400 text-sm bg-red-400/10 py-2 rounded border border-red-400/20">
                    {permissionError}
                </div>
            )}
        </div>

        {/* Recordings List */}
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-slate-200 pl-2 border-l-4 border-indigo-500">
                Ваши записи
            </h2>
            
            {recordings.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/50 border-dashed flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-slate-800/50 rounded-full">
                        <FileAudio size={32} className="text-slate-600" />
                    </div>
                    <p>Записей пока нет. Нажмите на микрофон или загрузите файл.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {recordings.map((recording) => (
                        <RecordingItem 
                            key={recording.id} 
                            recording={recording} 
                            onTranscribe={handleTranscribe}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;