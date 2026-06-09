/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="custom-confirmation-portal">
      <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-250">
        
        {/* Warning Icon Graphic */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
          isDestructive 
            ? 'bg-rose-50 border-rose-100 text-rose-600' 
            : 'bg-blue-50 border-blue-100 text-blue-600'
        }`}>
          {isDestructive ? (
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          ) : (
            <ShieldAlert className="w-6 h-6" />
          )}
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h4 className="font-extrabold text-slate-800 text-sm">{title}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Actions Button Panel */}
        <div className="flex gap-2 w-full pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            id="confirmation-cancel-btn"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs ${
              isDestructive 
                ? 'bg-rose-600 hover:bg-rose-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            id="confirmation-confirm-btn"
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}
