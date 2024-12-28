import {create} from 'zustand'
import {Buffer} from 'buffer'

// Create a singleton store instance
export const chunkStoreInstance = {
    chunkStore: null as any,
    currentChunkSet: null as any
};

interface ChunkState {
   chunkStore: {
      id: string | null,
      name: string,
      totalChunks: number,
      size: number,
      mimeType: string,
      chunkArray: Buffer[],
      receivedChunks: number,
   } | null,
   currentChunkSet: {
      id: string | null,
      totalChunks: number,
      chunkArray: Buffer[],
      sentChunks: number,
   } | null,
   setChunkStore: (chunkStore: any) => void,
   setCurrentChunkSet: (chunkSet: any) => void,
   resetChunkStore: () => void,
   resetCurrentChunkSet: () => void,
}

export const useChunkStore = create<ChunkState>((set, get) => ({
   chunkStore: null,
   currentChunkSet: null,
   setChunkStore: (chunkStore: any) => {
      console.log('Setting chunk store:', chunkStore);
      chunkStoreInstance.chunkStore = chunkStore;
      set({ chunkStore });
      console.log('Chunk store after set:', get().chunkStore);
   },
   setCurrentChunkSet: (chunkSet: any) => {
      console.log('Setting current chunk set:', chunkSet);
      chunkStoreInstance.currentChunkSet = chunkSet;
      set({ currentChunkSet: chunkSet });
      console.log('Current chunk set after set:', get().currentChunkSet);
   },
   resetChunkStore: () => {
      console.log('Resetting chunk store');
      chunkStoreInstance.chunkStore = null;
      set({ chunkStore: null });
   },
   resetCurrentChunkSet: () => {
      console.log('Resetting current chunk set');
      chunkStoreInstance.currentChunkSet = null;
      set({ currentChunkSet: null });
   },
}));
