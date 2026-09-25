/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Trash2, 
  Edit3, 
  Check, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { DepartmentTrainingPhoto } from '../../types';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  photos: DepartmentTrainingPhoto[];
  initialIndex?: number;
  onClose: () => void;
  onUpdateCaption?: (photoId: string, newCaption: string) => void;
  onDeletePhoto?: (photoId: string) => void;
  canEdit?: boolean;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  photos,
  initialIndex = 0,
  onClose,
  onUpdateCaption,
  onDeletePhoto,
  canEdit = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, photos.length - 1)));
      setZoomLevel(1);
      setRotation(0);
      setIsEditingCaption(false);
    }
  }, [isOpen, initialIndex, photos.length]);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    if (currentPhoto) {
      setCaptionText(currentPhoto.caption || '');
      setIsEditingCaption(false);
      setZoomLevel(1);
      setRotation(0);
    }
  }, [currentPhoto]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingCaption) return; // don't intercept arrow keys when typing
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, isEditingCaption]);

  if (!isOpen || !currentPhoto) return null;

  const goToPrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleSaveCaption = () => {
    if (onUpdateCaption && currentPhoto) {
      onUpdateCaption(currentPhoto.id, captionText.trim());
    }
    setIsEditingCaption(false);
  };

  const handleDownload = () => {
    const src = currentPhoto.downloadUrl || currentPhoto.url || currentPhoto.dataUrl;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = currentPhoto.fileName || `training_photo_${currentIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div 
      id="training-photo-lightbox"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md select-none animate-fadeIn"
    >
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#071326]/80 text-white z-20">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-blue-900/60 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold">
            Photo {currentIndex + 1} of {photos.length}
          </div>
          <span className="text-sm font-medium text-slate-300 truncate max-w-md hidden sm:inline">
            {currentPhoto.fileName}
          </span>
          {currentPhoto.fileSize && (
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              ({currentPhoto.fileSize})
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom & Rotation */}
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 min-w-[40px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-slate-700 mx-1" />

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
            title="Download Original Photo"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Delete Photo if allowed */}
          {canEdit && onDeletePhoto && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to remove this documentation photo?')) {
                  onDeletePhoto(currentPhoto.id);
                  if (photos.length <= 1) {
                    onClose();
                  } else {
                    goToNext();
                  }
                }
              }}
              className="p-2 rounded-lg bg-red-950/60 hover:bg-red-800 text-red-300 hover:text-white transition cursor-pointer"
              title="Delete Photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer ml-2"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Navigation Arrow Previous */}
        {photos.length > 1 && (
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-slate-900/80 hover:bg-blue-600 border border-slate-700 hover:border-blue-400 text-white shadow-2xl transition cursor-pointer group"
            title="Previous Photo (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Image Container with zoom & rotate */}
        <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto">
          <img
            src={currentPhoto.dataUrl || currentPhoto.url}
            alt={currentPhoto.caption || currentPhoto.fileName || 'Documentation Photo'}
            className="max-h-[70vh] sm:max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            }}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Navigation Arrow Next */}
        {photos.length > 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-slate-900/80 hover:bg-blue-600 border border-slate-700 hover:border-blue-400 text-white shadow-2xl transition cursor-pointer group"
            title="Next Photo (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Bottom Caption & Thumbnails Bar */}
      <div className="px-6 py-4 border-t border-slate-800 bg-[#071326]/90 z-20">
        {/* Caption Section */}
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 mb-3">
          <div className="flex-1">
            {isEditingCaption ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Enter photo caption (e.g. Opening discussion, Hands-on demonstration)..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-blue-500 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCaption();
                    if (e.key === 'Escape') setIsEditingCaption(false);
                  }}
                />
                <button
                  onClick={handleSaveCaption}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditingCaption(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <p className="text-sm text-slate-200 font-medium">
                  {currentPhoto.caption ? (
                    <span>&ldquo;{currentPhoto.caption}&rdquo;</span>
                  ) : (
                    <span className="text-slate-400 italic">No caption set for this photo</span>
                  )}
                </p>
                {canEdit && onUpdateCaption && (
                  <button
                    onClick={() => {
                      setCaptionText(currentPhoto.caption || '');
                      setIsEditingCaption(true);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 transition cursor-pointer"
                    title="Edit Caption"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Uploaded: {new Date(currentPhoto.uploadedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Thumbnail Filmstrip */}
        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-3xl mx-auto scrollbar-thin">
            {photos.map((photo, idx) => (
              <button
                key={photo.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition cursor-pointer ${
                  idx === currentIndex 
                    ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30' 
                    : 'border-transparent opacity-60 hover:opacity-100 hover:border-slate-600'
                }`}
              >
                <img
                  src={photo.dataUrl || photo.url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default PhotoLightboxModal;
