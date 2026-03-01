/**
 * Video System Type Definitions
 * Custom video player with transcripts and progress tracking
 */

/**
 * Video quality options
 */
export type VideoQuality = '360p' | '480p' | '720p' | '1080p' | 'auto';

/**
 * Video category
 */
export type VideoCategory = 
  | 'tutorial'
  | 'lecture'
  | 'demo'
  | 'case-study'
  | 'interview'
  | 'workshop';

/**
 * Video transcript segment
 */
export interface TranscriptSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number;
  text: string;
  speaker?: string;
}

/**
 * Video chapter/section
 */
export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
}

/**
 * Video metadata
 */
export interface Video {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  duration: number; // in seconds
  thumbnailUrl: string;
  videoUrl: string;
  qualities: VideoQuality[];
  transcript?: TranscriptSegment[];
  chapters?: VideoChapter[];
  tags: string[];
  instructor?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relatedVideos?: string[]; // Video IDs
  resources?: {
    title: string;
    url: string;
    type: 'pdf' | 'code' | 'link';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video playback state
 */
export interface VideoPlaybackState {
  videoId: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  playbackRate: number;
  quality: VideoQuality;
  isFullscreen: boolean;
  isMuted: boolean;
}

/**
 * User's video progress
 */
export interface VideoProgress {
  videoId: string;
  userId: string;
  watchedSeconds: number;
  totalSeconds: number;
  completed: boolean;
  lastWatchedAt: Date;
  completedAt?: Date;
  bookmarks: VideoBookmark[];
  notes: VideoNote[];
}

/**
 * Video bookmark
 */
export interface VideoBookmark {
  id: string;
  videoId: string;
  timestamp: number;
  title: string;
  description?: string;
  createdAt: Date;
}

/**
 * Video note
 */
export interface VideoNote {
  id: string;
  videoId: string;
  timestamp: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video playlist
 */
export interface VideoPlaylist {
  id: string;
  title: string;
  description: string;
  videoIds: string[];
  thumbnailUrl?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video filter options
 */
export interface VideoFilters {
  category?: VideoCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  instructor?: string;
  minDuration?: number;
  maxDuration?: number;
  completed?: boolean;
}

/**
 * Video sort options
 */
export type VideoSortBy = 
  | 'title'
  | 'duration'
  | 'newest'
  | 'popular'
  | 'recommended';

/**
 * Video context state
 */
export interface VideoContextState {
  currentVideo: Video | null;
  playbackState: VideoPlaybackState | null;
  progress: Map<string, VideoProgress>;
  playlists: VideoPlaylist[];
  isLoading: boolean;
  error: string | null;
}

// Made with Bob
