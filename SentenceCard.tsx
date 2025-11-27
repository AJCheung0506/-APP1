import React, { useState, useMemo, useEffect } from 'react';
import { Sentence, Difficulty } from '../types';
import { Play, Repeat, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { formatTime } from '../utils/fileUtils';

interface SentenceCardProps {
  sentence: Sentence;
  index: number;
  isPlaying: boolean;
  onPlay: (start: number, end: number, index: number) => void;
  difficulty: Difficulty | null; // null means no cloze (study mode)
}

const SentenceCard: React.FC<SentenceCardProps> = ({ 
  sentence, 
  index, 
  isPlaying, 
  onPlay,
  difficulty 
}) => {
  const [revealed, setRevealed] = useState(false);
  const [userInputs, setUserInputs] = useState<{[key: number]: string}>({});

  // Reset local state when difficulty changes
  useEffect(() => {
    setRevealed(false);
    setUserInputs({});
  }, [difficulty]);

  const words = useMemo(() => sentence.text.split(' '), [sentence.text]);

  const hiddenIndices = useMemo(() => {
    if (!difficulty) return new Set<number>();
    
    const indices = new Set<number>();
    let probability = 0;
    
    switch (difficulty) {
      case Difficulty.EASY: probability = 0.2; break;
      case Difficulty.MEDIUM: probability = 0.4; break;
      case Difficulty.HARD: probability = 0.6; break;
    }

    words.forEach((word, i) => {
      // Don't hide punctuation-only "words" if possible, but simple split handles mostly text
      if (Math.random() < probability && word.length > 1) {
        indices.add(i);
      }
    });
    
    return indices;
  }, [difficulty, words]);

  const handleInputChange = (index: number, value: string) => {
    setUserInputs(prev => ({ ...prev, [index]: value }));
  };

  const isCorrect = (index: number) => {
    const input = userInputs[index] || '';
    const cleanInput = input.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
    const cleanWord = words[index].trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
    return cleanInput === cleanWord;
  };

  return (
    <div 
      className={`p-4 mb-4 rounded-xl border transition-all duration-300 ${
        isPlaying 
          ? 'bg-blue-50 border-blue-400 shadow-md transform scale-[1.01]' 
          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Play Control */}
        <button
          onClick={() => onPlay(sentence.startTime, sentence.endTime, index)}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isPlaying ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
          }`}
          aria-label="Play sentence"
        >
          {isPlaying ? <Repeat size={18} className="animate-pulse" /> : <Play size={18} className="ml-0.5" />}
        </button>

        <div className="flex-grow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-gray-400">
              #{index + 1} • {formatTime(sentence.startTime)} - {formatTime(sentence.endTime)}
            </span>
          </div>

          {/* Text Area */}
          <div className="text-lg leading-relaxed text-gray-800 mb-2">
            {difficulty === null || revealed ? (
              <p>{sentence.text}</p>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {words.map((word, i) => {
                  if (hiddenIndices.has(i)) {
                    const status = isCorrect(i) ? 'correct' : (userInputs[i] ? 'wrong' : 'empty');
                    return (
                      <input
                        key={i}
                        type="text"
                        style={{ width: `${Math.max(word.length * 10, 40)}px` }}
                        className={`border-b-2 px-1 py-0.5 outline-none text-center transition-colors font-medium
                          ${status === 'correct' ? 'border-green-500 text-green-700 bg-green-50' : ''}
                          ${status === 'wrong' ? 'border-red-300 text-red-600 bg-red-50' : ''}
                          ${status === 'empty' ? 'border-gray-300 focus:border-blue-500' : ''}
                        `}
                        value={userInputs[i] || ''}
                        onChange={(e) => handleInputChange(i, e.target.value)}
                        placeholder="?"
                      />
                    );
                  }
                  return <span key={i}>{word}</span>;
                })}
              </div>
            )}
          </div>
          
          {/* Translation */}
          {sentence.translation && (
            <p className="text-sm text-gray-500 mt-1 italic">
              {revealed || difficulty === null ? sentence.translation : "Translation hidden"}
            </p>
          )}
        </div>

        {/* Cloze Controls */}
        {difficulty !== null && (
          <button
            onClick={() => setRevealed(!revealed)}
            className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors p-2"
            title={revealed ? "Hide answers" : "Show answers"}
          >
            {revealed ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default SentenceCard;