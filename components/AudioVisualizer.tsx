import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps } from '../types';

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaStreamAudioSourceNode>();

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Audio Context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    
    // Ensure context is running (sometimes suspended by browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;
      
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5; // Scale down height

        // Gradient color
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#6366f1'); // Indigo 500
        gradient.addColorStop(1, '#a855f7'); // Purple 500

        ctx.fillStyle = gradient;
        
        // Rounded tops for bars look cleaner
        if (barHeight > 0) {
            ctx.beginPath();
            ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 4);
            ctx.fill();
        }

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // We don't close audio context here to reuse it, but we disconnect nodes
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      // Clear canvas
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [stream, isRecording]);

  // Clean up context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="w-full h-32 bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 backdrop-blur-sm shadow-inner flex items-center justify-center">
      {!isRecording && (
        <div className="text-slate-500 text-sm font-medium">
          Готов к записи
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={600}
        height={128}
        className="w-full h-full"
      />
    </div>
  );
};

export default AudioVisualizer;