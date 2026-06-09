import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Yes, Reset",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="confirm-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          id="confirm-modal-container"
          className="w-full max-w-md overflow-hidden bg-[#FAF9F6] border border-[#E5E3DB] rounded-2xl shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E3DB] bg-white">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" id="confirm-modal-icon" />
              <h3 className="font-sans font-semibold text-[#2C2C28]" id="confirm-modal-title">
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close dialog"
              id="confirm-modal-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6" id="confirm-modal-body">
            <p className="text-sm leading-relaxed text-[#5C5C54]">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-[#E5E3DB]">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-[#5C5C54] hover:bg-gray-50 border border-[#E5E3DB] rounded-xl transition-all font-sans min-h-[44px]"
              id="confirm-modal-cancel-btn"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all font-sans min-h-[44px]"
              id="confirm-modal-confirm-btn"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
