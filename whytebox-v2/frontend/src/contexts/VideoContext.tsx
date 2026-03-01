/**
 * Video Context
 * Manages video playback, progress tracking, and bookmarks
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Video,
  VideoPlaybackState,
  VideoProgress,
  VideoBookmark,
  VideoNote,
  VideoPlaylist,
  VideoContextState,
} from '../types/video';

interface VideoContextValue extends VideoContextState {
  // Video management
  loadVideo: (video: Video) => void;
  unloadVideo: () => void;
  
  // Playback control
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setQuality: (quality: string) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  
  // Progress tracking
  updateProgress: (videoId: string, currentTime: number) => void;
  markCompleted: (videoId: string) => void;
  getVideoProgress: (videoId: string) => VideoProgress | null;
  
  // Bookmarks
  addBookmark: (videoId: string, timestamp: number, title: string, description?: string) => void;
  removeBookmark: (videoId: string, bookmarkId: string) => void;
  getBookmarks: (videoId: string) => VideoBookmark[];
  
  // Notes
  addNote: (videoId: string, timestamp: number, content: string) => void;
  updateNote: (videoId: string, noteId: string, content: string) => void;
  removeNote: (videoId: string, noteId: string) => void;
  getNotes: (videoId: string) => VideoNote[];
  
  // Playlists
  createPlaylist: (title: string, description: string, videoIds: string[]) => void;
  addToPlaylist: (playlistId: string, videoId: string) => void;
  removeFromPlaylist: (playlistId: string, videoId: string) => void;
}

const VideoContext = createContext<VideoContextValue | undefined>(undefined);

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within VideoProvider');
  }
  return context;
};

interface VideoProviderProps {
  children: React.ReactNode;
}

export const VideoProvider: React.FC<VideoProviderProps> = ({ children }) => {
  const [state, setState] = useState<VideoContextState>({
    currentVideo: null,
    playbackState: null,
    progress: new Map(),
    playlists: [],
    isLoading: false,
    error: null,
  });

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('videoProgress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        const progress = new Map(Object.entries(parsed).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            lastWatchedAt: new Date(value.lastWatchedAt),
            completedAt: value.completedAt ? new Date(value.completedAt) : undefined,
          },
        ]));
        setState(prev => ({ ...prev, progress }));
      } catch (error) {
        console.error('Failed to load video progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    const progressObj = Object.fromEntries(state.progress);
    localStorage.setItem('videoProgress', JSON.stringify(progressObj));
  }, [state.progress]);

  /**
   * Load a video
   */
  const loadVideo = useCallback((video: Video) => {
    const playbackState: VideoPlaybackState = {
      videoId: video.id,
      currentTime: 0,
      duration: video.duration,
      isPlaying: false,
      volume: 1,
      playbackRate: 1,
      quality: 'auto',
      isFullscreen: false,
      isMuted: false,
    };

    setState(prev => ({
      ...prev,
      currentVideo: video,
      playbackState,
    }));
  }, []);

  /**
   * Unload current video
   */
  const unloadVideo = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentVideo: null,
      playbackState: null,
    }));
  }, []);

  /**
   * Play video
   */
  const play = useCallback(() => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          isPlaying: true,
        },
      };
    });
  }, []);

  /**
   * Pause video
   */
  const pause = useCallback(() => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          isPlaying: false,
        },
      };
    });
  }, []);

  /**
   * Seek to specific time
   */
  const seek = useCallback((time: number) => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          currentTime: time,
        },
      };
    });
  }, []);

  /**
   * Set volume
   */
  const setVolume = useCallback((volume: number) => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          volume: Math.max(0, Math.min(1, volume)),
        },
      };
    });
  }, []);

  /**
   * Set playback rate
   */
  const setPlaybackRate = useCallback((rate: number) => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          playbackRate: rate,
        },
      };
    });
  }, []);

  /**
   * Set quality
   */
  const setQuality = useCallback((quality: string) => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          quality: quality as any,
        },
      };
    });
  }, []);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          isMuted: !prev.playbackState.isMuted,
        },
      };
    });
  }, []);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(() => {
    setState(prev => {
      if (!prev.playbackState) return prev;
      return {
        ...prev,
        playbackState: {
          ...prev.playbackState,
          isFullscreen: !prev.playbackState.isFullscreen,
        },
      };
    });
  }, []);

  /**
   * Update video progress
   */
  const updateProgress = useCallback((videoId: string, currentTime: number) => {
    setState(prev => {
      const progress = new Map(prev.progress);
      const existing = progress.get(videoId);
      
      const updated: VideoProgress = {
        videoId,
        userId: 'current-user', // TODO: Get from auth
        watchedSeconds: currentTime,
        totalSeconds: prev.currentVideo?.duration || 0,
        completed: existing?.completed || false,
        lastWatchedAt: new Date(),
        completedAt: existing?.completedAt,
        bookmarks: existing?.bookmarks || [],
        notes: existing?.notes || [],
      };
      
      progress.set(videoId, updated);
      return { ...prev, progress };
    });
  }, []);

  /**
   * Mark video as completed
   */
  const markCompleted = useCallback((videoId: string) => {
    setState(prev => {
      const progress = new Map(prev.progress);
      const existing = progress.get(videoId);
      
      if (existing) {
        progress.set(videoId, {
          ...existing,
          completed: true,
          completedAt: new Date(),
        });
      }
      
      return { ...prev, progress };
    });
  }, []);

  /**
   * Get video progress
   */
  const getVideoProgress = useCallback((videoId: string): VideoProgress | null => {
    return state.progress.get(videoId) || null;
  }, [state.progress]);

  /**
   * Add bookmark
   */
  const addBookmark = useCallback((
    videoId: string,
    timestamp: number,
    title: string,
    description?: string
  ) => {
    setState(prev => {
      const progress = new Map(prev.progress);
      const existing = progress.get(videoId);
      
      const bookmark: VideoBookmark = {
        id: `bookmark-${Date.now()}`,
        videoId,
        timestamp,
        title,
        description,
        createdAt: new Date(),
      };
      
      if (existing) {
        progress.set(videoId, {
          ...existing,
          bookmarks: [...existing.bookmarks, bookmark],
        });
      }
      
      return { ...prev, progress };
    });
  }, []);

  /**
   * Remove bookmark
   */
  const removeBookmark = useCallback((videoId: string, bookmarkId: string) => {
    setState(prev => {
      const progress = new Map(prev.progress);
      const existing = progress.get(videoId);
      
      if (existing) {
        progress.set(videoId, {
          ...existing,
          bookmarks: existing.bookmarks.filter(b => b.id !== bookmarkId),
        });
      }
      
      return { ...prev, progress };
    });
  }, []);

  /**
   * Get bookmarks
   */
  const getBookmarks = useCallback((videoId: string): VideoBookmark[] => {
    const progress = state.progress.get(videoId);
    return progress?.bookmarks || [];
  }, [state.progress]);

  /**
   * Add note
   */
  const addNote = useCallback((videoId: string, timestamp: number, content: string) => {
    setState(prev => {
      const progress = new Map(prev.progress);
      const existing = progress.get(videoId);
      
      const note: VideoNote = {
        id: `note-${Date.now()}`,
        videoId,
        timestamp,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (existing) {
        progress.set(videoId, {
          ...existing,
          notes: [...existing.notes, note],
        });
      }
      
      return { ...prev, progress };
    });
  }, []);

  /**
   * Update note
   */
  const updateNote = useCallback((videoId: string, noteId: string, content: string) => {
    setState(prev => {
      const progress = new Map(prev.progress);
      const existing = progress.get(videoId);
      
      if (existing) {
        progress.set(videoId, {
          ...existing,
          notes: existing.notes.map(n =>
            n.id === noteId ? { ...n, content, updatedAt: new Date() } : n
          ),
        });
      }
      
      return { ...prev, progress };
    });
  }, []);

  /**
   * Remove note
   */
  const removeNote = useCallback((videoId: string, noteId: string) => {
    setState(prev => {
      const progress = new Map(prev.progress);
      const existing = progress.get(videoId);
      
      if (existing) {
        progress.set(videoId, {
          ...existing,
          notes: existing.notes.filter(n => n.id !== noteId),
        });
      }
      
      return { ...prev, progress };
    });
  }, []);

  /**
   * Get notes
   */
  const getNotes = useCallback((videoId: string): VideoNote[] => {
    const progress = state.progress.get(videoId);
    return progress?.notes || [];
  }, [state.progress]);

  /**
   * Create playlist
   */
  const createPlaylist = useCallback((title: string, description: string, videoIds: string[]) => {
    const playlist: VideoPlaylist = {
      id: `playlist-${Date.now()}`,
      title,
      description,
      videoIds,
      isPublic: false,
      createdBy: 'current-user', // TODO: Get from auth
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setState(prev => ({
      ...prev,
      playlists: [...prev.playlists, playlist],
    }));
  }, []);

  /**
   * Add to playlist
   */
  const addToPlaylist = useCallback((playlistId: string, videoId: string) => {
    setState(prev => ({
      ...prev,
      playlists: prev.playlists.map(p =>
        p.id === playlistId
          ? { ...p, videoIds: [...p.videoIds, videoId], updatedAt: new Date() }
          : p
      ),
    }));
  }, []);

  /**
   * Remove from playlist
   */
  const removeFromPlaylist = useCallback((playlistId: string, videoId: string) => {
    setState(prev => ({
      ...prev,
      playlists: prev.playlists.map(p =>
        p.id === playlistId
          ? { ...p, videoIds: p.videoIds.filter(id => id !== videoId), updatedAt: new Date() }
          : p
      ),
    }));
  }, []);

  const value: VideoContextValue = {
    ...state,
    loadVideo,
    unloadVideo,
    play,
    pause,
    seek,
    setVolume,
    setPlaybackRate,
    setQuality,
    toggleMute,
    toggleFullscreen,
    updateProgress,
    markCompleted,
    getVideoProgress,
    addBookmark,
    removeBookmark,
    getBookmarks,
    addNote,
    updateNote,
    removeNote,
    getNotes,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
  };

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
};

// Made with Bob
