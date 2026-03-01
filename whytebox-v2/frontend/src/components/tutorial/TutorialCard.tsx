/**
 * TutorialCard Component
 * 
 * Displays a tutorial in card format
 */

import React from 'react';
import type { Tutorial } from '@/types/tutorial';

interface TutorialCardProps {
  tutorial: Tutorial;
  progress?: number;
  onClick?: (tutorial: Tutorial) => void;
  onStart?: (tutorialId: string) => void;
}

export const TutorialCard: React.FC<TutorialCardProps> = ({
  tutorial,
  progress,
  onClick,
  onStart,
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
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

  const getProgressStatus = () => {
    if (progress === undefined) return null;
    if (progress === 100) return 'Completed';
    if (progress > 0) return 'In Progress';
    return null;
  };

  const displayTags = tutorial.tags.slice(0, 3);
  const remainingTags = tutorial.tags.length - 3;

  return (
    <article
      role="article"
      aria-label={`Tutorial: ${tutorial.title}`}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
      onClick={() => onClick?.(tutorial)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.(tutorial);
      }}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold truncate flex-1">
          {tutorial.title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(tutorial.difficulty)}`}>
          {tutorial.difficulty.charAt(0).toUpperCase() + tutorial.difficulty.slice(1)}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 line-clamp-2">
        {tutorial.description}
      </p>

      {/* Meta Information */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span>{tutorial.category}</span>
        <span>•</span>
        <span>{formatDuration(tutorial.estimatedTime)}</span>
        {tutorial.prerequisites && tutorial.prerequisites.length > 0 && (
          <>
            <span>•</span>
            <span>Prerequisites</span>
          </>
        )}
      </div>

      {/* Tags */}
      {tutorial.tags.length > 0 && (
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

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-gray-200 rounded-full h-2"
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {getProgressStatus() && (
            <span className="text-xs text-gray-500 mt-1 inline-block">
              {getProgressStatus()}
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStart?.(tutorial.id);
        }}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        {progress === 100 ? 'Review' : progress ? 'Continue' : 'Start Tutorial'}
      </button>
    </article>
  );
};

// Made with Bob
