/**
 * QuizCard Component
 * 
 * Displays a quiz in card format
 */

import React from 'react';
import type { Quiz } from '@/types/quiz';

interface QuizCardProps {
  quiz: Quiz;
  score?: number;
  userScore?: number;
  attempts?: number;
  completed?: boolean;
  onClick?: (quiz: Quiz) => void;
  onStart?: (quiz: Quiz) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  score,
  userScore,
  attempts,
  completed,
  onClick,
  onStart,
}) => {
  const displayScore = userScore ?? score;
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getScoreColor = (score: number) => {
    if (score >= quiz.passingScore) return 'text-green-600';
    if (score >= quiz.passingScore * 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isPassed = displayScore !== undefined && displayScore >= quiz.passingScore;
  const displayTags = quiz.tags.slice(0, 3);
  const remainingTags = quiz.tags.length - 3;

  return (
    <article
      role="article"
      aria-label={`Quiz: ${quiz.title}`}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
      onClick={() => onClick?.(quiz)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.(quiz);
      }}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold truncate flex-1">
          {quiz.title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(quiz.difficulty)}`}>
          {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 line-clamp-2">
        {quiz.description}
      </p>

      {/* Meta Information */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span>{quiz.category}</span>
        <span>•</span>
        <span>{quiz.questions.length} questions</span>
        <span>•</span>
        <span>{formatDuration(quiz.estimatedTime)}</span>
        {quiz.prerequisites && quiz.prerequisites.length > 0 && (
          <>
            <span>•</span>
            <span>Prerequisites</span>
          </>
        )}
      </div>

      {/* Passing Score */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <span>Passing Score:</span>
        <span className="font-medium">{quiz.passingScore}%</span>
      </div>

      {/* Tags */}
      {quiz.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs"
            >
              {tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs">
              +{remainingTags} more
            </span>
          )}
        </div>
      )}

      {/* Score Display */}
      {displayScore !== undefined && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Your Best Score:</span>
            <span className={`text-lg font-bold ${getScoreColor(displayScore)}`}>
              {displayScore}%
            </span>
          </div>
          {isPassed && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-green-600 text-sm font-medium">✓ Passed</span>
            </div>
          )}
          {attempts !== undefined && attempts > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              Attempts: {attempts}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStart?.(quiz);
        }}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        {displayScore !== undefined ? 'Retake Quiz' : 'Start Quiz'}
      </button>
    </article>
  );
};

// Made with Bob
