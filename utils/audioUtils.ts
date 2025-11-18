export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the Data URI prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getAudioDuration = (blob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      // Avoid Infinity for streams that haven't started (though uncommon for blobs)
      const duration = audio.duration === Infinity ? 0 : audio.duration;
      resolve(duration);
    };
    
    audio.onerror = () => {
       URL.revokeObjectURL(url);
       resolve(0);
    }
  });
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimestamp = (timestamp: number): string => {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(timestamp));
};