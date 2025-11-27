import React, { useState, useRef, useEffect, useCallback } from 'react';
import { processAudioFile } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import { Sentence, ProcessingState, Difficulty } from './types';
import SentenceCard from './components/SentenceCard';
import { 
  Upload, 
  Loader2, 
  Headphones, 
  BookOpen, 
  Wand2, 
  AlertCircle,
  Volume2
} from 'lucide-react';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);

  const audioRef = useRef<HTMLAudioElement>(null);
  const endTimeRef = useRef<number | null>(null);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioSrc]);

  // Audio Playback Logic for Segments
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && endTimeRef.current !== null) {
      if (audioRef.current.currentTime >= endTimeRef.current) {
        audioRef.current.pause();
        endTimeRef.current = null;
        setCurrentSentenceIndex(null);
      }
      // In segment mode (endTimeRef is set), we rely on the manual set from playSegment
      // to avoid highlighting the previous sentence during the buffer period.
      return;
    }
    
    // Continuous playback: Update active sentence based on current time
    if (audioRef.current && !audioRef.current.paused && sentences.length > 0) {
      const currentTime = audioRef.current.currentTime;
      const buffer = 0.2; // Slight anticipation for visual sync in continuous mode
      // Find sentence that encompasses current time
      const index = sentences.findIndex(s => currentTime >= (s.startTime - buffer) && currentTime < s.endTime);
      if (index !== -1 && index !== currentSentenceIndex) {
        setCurrentSentenceIndex(index);
      }
    }
  }, [sentences, currentSentenceIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('timeupdate', handleTimeUpdate);
      return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [handleTimeUpdate]);

  const playSegment = (start: number, end: number, index: number) => {
    if (audioRef.current) {
      const buffer = 0.5; // 0.5s buffer to ensure start of sentence is clear
      audioRef.current.currentTime = Math.max(0, start - buffer);
      endTimeRef.current = end;
      setCurrentSentenceIndex(index); // Immediately highlight the target sentence
      audioRef.current.play();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setAudioFile(file);
    setAudioSrc(URL.createObjectURL(file));
    setSentences([]);
    setProcessingState({ status: 'processing' });
    setCurrentSentenceIndex(null);
    endTimeRef.current = null;

    try {
      const base64Audio = await fileToBase64(file);
      const result = await processAudioFile(base64Audio, file.type);
      setSentences(result);
      setProcessingState({ status: 'success' });
    } catch (error) {
      setProcessingState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 sm:px-6">
      <header className="max-w-4xl w-full mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Headphones size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">精听练习 App</h1>
        </div>
        <p className="text-gray-500">AI-Powered Intensive Listening & Cloze Practice</p>
      </header>

      <main className="max-w-3xl w-full space-y-8">
        
        {/* Section 1: Upload */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center transition-all hover:shadow-md">
          {!audioFile ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Upload Audio File</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Supports MP3, WAV, AAC. The AI will automatically analyze text and split sentences for you.
              </p>
              <div className="flex justify-center mt-6">
                <label className="relative cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-full transition-all duration-200 transform hover:scale-105">
                  <span>Select File</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="audio/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 mb-4 text-gray-700 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                <Volume2 size={20} className="text-blue-500"/>
                <span className="font-medium truncate max-w-xs">{audioFile.name}</span>
                <button 
                  onClick={() => {
                    setAudioFile(null);
                    setAudioSrc(null);
                    setSentences([]);
                    setProcessingState({ status: 'idle' });
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                    }
                  }}
                  className="ml-2 text-xs text-red-500 hover:text-red-700 underline"
                >
                  Change
                </button>
              </div>
              
              <audio 
                ref={audioRef} 
                controls 
                src={audioSrc || undefined} 
                className="w-full max-w-md mb-4"
              />
            </div>
          )}
        </section>

        {/* Section 2: Loading State */}
        {processingState.status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-300">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-700">Analyzing Audio...</h3>
            <p className="text-gray-500 text-sm mt-1">Gemini is transcribing and segmenting your sentences.</p>
          </div>
        )}

        {/* Section 3: Error State */}
        {processingState.status === 'error' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <h3 className="text-red-800 font-medium">Processing Error</h3>
              <p className="text-red-600 text-sm mt-1">{processingState.message}</p>
            </div>
          </div>
        )}

        {/* Section 4: Results & Practice Area */}
        {processingState.status === 'success' && sentences.length > 0 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-4 z-10 gap-4">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setMode('study')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'study' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2"><BookOpen size={16} /> Study Mode</span>
                </button>
                <button
                  onClick={() => setMode('quiz')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === 'quiz' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2"><Wand2 size={16} /> Quiz Mode</span>
                </button>
              </div>

              {mode === 'quiz' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium">Difficulty:</span>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                  >
                    <option value={Difficulty.EASY}>Easy (20%)</option>
                    <option value={Difficulty.MEDIUM}>Medium (40%)</option>
                    <option value={Difficulty.HARD}>Hard (60%)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Sentence List */}
            <div className="space-y-4 pb-20">
              {sentences.map((sentence, index) => (
                <SentenceCard
                  key={index}
                  index={index}
                  sentence={sentence}
                  isPlaying={currentSentenceIndex === index}
                  onPlay={playSegment}
                  difficulty={mode === 'quiz' ? difficulty : null}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;