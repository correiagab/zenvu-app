import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { TxType } from './categories';

interface UI {
  addOpen: TxType | null;
  editTxId: string | null;
  toast: string | null;
  openAdd: (type?: TxType) => void;
  openTx: (id: string) => void;
  close: () => void;
  showToast: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUI = create<UI>((set) => ({
  addOpen: null,
  editTxId: null,
  toast: null,
  openAdd: (type = 'expense') => set({ addOpen: type, editTxId: null }),
  openTx: (id) => set({ editTxId: id, addOpen: null }),
  close: () => set({ addOpen: null, editTxId: null }),
  showToast: (msg) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
}));

export function tap(style: 'light' | 'medium' = 'light') {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium }).catch(() => {});
  } else if ('vibrate' in navigator) {
    try { navigator.vibrate(style === 'light' ? 8 : 15); } catch { /* unsupported */ }
  }
}
