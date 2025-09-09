"use client";
import React, { useState } from 'react';

interface NavigationProps {
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  onModeChange?: (mode: 'live' | 'forecast' | 'historical') => void;
}

export function Navigation({ onSearchClick, onSettingsClick, onModeChange }: NavigationProps) {
  const [activeMode, setActiveMode] = useState<'live' | 'forecast' | 'historical'>('live');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleModeChange = (mode: 'live' | 'forecast' | 'historical') => {
    setActiveMode(mode);
    onModeChange?.(mode);
  };

  return (
    <nav className="absolute top-0 left-0 right-0 z-30 glass animate-slide-in-bottom">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg gradient-border flex items-center justify-center">
            <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold">AtmosInsight</h1>
            <p className="text-xs text-gray-400">Weather Intelligence Platform</p>
          </div>
        </div>

        {/* Center Controls - Desktop */}
        <div className="hidden md:flex items-center space-x-2">
          <button 
            onClick={() => handleModeChange('live')}
            className={`px-4 py-2 rounded-lg glass smooth-transition text-sm ${
              activeMode === 'live' ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Live</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </span>
          </button>
          <button 
            onClick={() => handleModeChange('forecast')}
            className={`px-4 py-2 rounded-lg glass smooth-transition text-sm ${
              activeMode === 'forecast' ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            Forecast
          </button>
          <button 
            onClick={() => handleModeChange('historical')}
            className={`px-4 py-2 rounded-lg glass smooth-transition text-sm ${
              activeMode === 'historical' ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            Historical
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={onSearchClick}
            className="p-2 rounded-lg glass hover:bg-white/10 smooth-transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button 
            onClick={onSettingsClick}
            className="p-2 rounded-lg glass hover:bg-white/10 smooth-transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg glass hover:bg-white/10 smooth-transition md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-2">
          <button 
            onClick={() => handleModeChange('live')}
            className={`w-full px-4 py-2 rounded-lg glass text-sm text-left ${
              activeMode === 'live' ? 'bg-white/20' : ''
            }`}
          >
            Live
          </button>
          <button 
            onClick={() => handleModeChange('forecast')}
            className={`w-full px-4 py-2 rounded-lg glass text-sm text-left ${
              activeMode === 'forecast' ? 'bg-white/20' : ''
            }`}
          >
            Forecast
          </button>
          <button 
            onClick={() => handleModeChange('historical')}
            className={`w-full px-4 py-2 rounded-lg glass text-sm text-left ${
              activeMode === 'historical' ? 'bg-white/20' : ''
            }`}
          >
            Historical
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navigation;