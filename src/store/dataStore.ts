import { create } from 'zustand';
import { triggerAutoBackup } from '../services/backup';

interface DataStore {
  dataVersion: number;
  bumpDataVersion: (options?: { skipAutoBackup?: boolean }) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  dataVersion: 0,
  bumpDataVersion: (options) => {
    set((state) => ({ dataVersion: state.dataVersion + 1 }));
    if (!options?.skipAutoBackup) {
      triggerAutoBackup(3000);
    }
  },
}));
