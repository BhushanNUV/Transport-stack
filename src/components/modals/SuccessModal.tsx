'use client';

import { CheckCircle, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  actionLabel = 'OK',
  onAction,
}: SuccessModalProps) {
  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  {title}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleAction}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {actionLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}