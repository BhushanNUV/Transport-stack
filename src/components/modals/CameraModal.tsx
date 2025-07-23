'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Camera, X, RotateCw, CheckCircle } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageBlob: Blob) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setCapturedImage(null);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      console.error('Video or canvas not ready');
      return;
    }

    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Wait a bit to ensure video is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if video is ready
      if (video.readyState < video.HAVE_CURRENT_DATA) {
        throw new Error('Video stream not ready');
      }
      
      // Get actual video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      if (!videoWidth || !videoHeight) {
        throw new Error('Invalid video dimensions');
      }
      
      // Set canvas dimensions to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      // Draw the current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob with a promise
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        }, 'image/jpeg', 0.9);
      });
      
      // Create preview URL
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);
      
      // Stop the camera stream after capturing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsStreaming(false);
      
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
          handleClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Capture Driver Photo
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            ) : null}

            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              {capturedImage ? (
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                    style={{ display: isStreaming ? 'block' : 'none' }}
                    onLoadedMetadata={() => {
                      console.log('Video metadata loaded');
                    }}
                  />
                  {!isStreaming && !error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                  )}
                </>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-center space-x-4 mt-6">
              {capturedImage ? (
                <>
                  <button
                    onClick={retakePhoto}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
                  >
                    <RotateCw className="h-5 w-5" />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={confirmPhoto}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Use Photo</span>
                  </button>
                </>
              ) : (
                <>
                  {isStreaming && (
                    <>
                      <button
                        onClick={switchCamera}
                        className="flex items-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
                      >
                        <RotateCw className="h-5 w-5" />
                        <span>Switch Camera</span>
                      </button>
                      <button
                        onClick={capturePhoto}
                        disabled={isCapturing}
                        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCapturing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Capturing...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-5 w-5" />
                            <span>Capture Photo</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Position the driver's face within the frame and click "Capture Photo"
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}