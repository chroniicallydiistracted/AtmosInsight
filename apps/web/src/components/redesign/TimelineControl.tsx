"use client";
import React, { useState, useRef, useEffect } from 'react';

interface TimelineControlProps {
  onTimeChange?: (time: Date) => void;
  onPlaybackSpeedChange?: (speed: number) => void;
  duration?: number; // in minutes
}

export function TimelineControl({ 
  onTimeChange, 
  onPlaybackSpeedChange,
  duration = 120 // default 2 hours
}: TimelineControlProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(70);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setProgress(prev => {
          const next = prev + (playbackSpeed * 0.5);
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const handleProgressChange = (value: number) => {
    setProgress(value);
    const minutesFromStart = (value / 100) * duration - duration;
    if (currentTime) {
      const time = new Date(currentTime.getTime() + minutesFromStart * 60000);
      onTimeChange?.(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    onPlaybackSpeedChange?.(speed);
  };

  const handleStepBackward = () => {
    setProgress(Math.max(0, progress - 5));
  };

  const handleStepForward = () => {
    setProgress(Math.min(100, progress + 5));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 animate-slide-in-bottom">
      <div className="glass rounded-xl p-4 max-w-4xl mx-auto">
        <div className="flex items-center space-x-4">
          {/* Play Controls */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleStepBackward}
              className="p-2 rounded-lg hover:bg-white/10 smooth-transition"
              aria-label="Step backward"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg hover:bg-white/10 smooth-transition"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button 
              onClick={handleStepForward}
              className="p-2 rounded-lg hover:bg-white/10 smooth-transition"
              aria-label="Step forward"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Timeline Slider */}
          <div className="flex-1 flex items-center space-x-3">
            <span className="text-xs text-gray-400 whitespace-nowrap">-{duration/60}h</span>
            <div className="flex-1 relative">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={progress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    rgb(14 165 233) 0%, 
                    rgb(139 92 246) ${progress}%, 
                    rgba(255, 255, 255, 0.1) ${progress}%, 
                    rgba(255, 255, 255, 0.1) 100%)`
                }}
              />
              {/* Timeline Markers */}
              <div className="absolute -bottom-3 left-0 right-0 flex justify-between px-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-px h-2 bg-gray-600" />
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">Now</span>
          </div>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Speed:</span>
            <select 
              value={playbackSpeed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-white/10 text-xs focus:outline-none"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>

          {/* Time Display */}
          <div className="text-right">
            {mounted && currentTime ? (
              <>
                <p className="text-sm font-medium">{formatTime(currentTime)} MST</p>
                <p className="text-xs text-gray-400">{formatDate(currentTime)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">--:-- MST</p>
                <p className="text-xs text-gray-400">--</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimelineControl;