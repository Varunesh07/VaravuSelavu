import { create } from 'zustand';

interface DataStore {
  dataVersion: number;
  bumpDataVersion: () => void;
}

export const useDataStore = create<DataStore>((set) => ({
  dataVersion: 0,
  bumpDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
}));
