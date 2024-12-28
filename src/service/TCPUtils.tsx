import { Alert } from "react-native";
import { useChunkStore, chunkStoreInstance } from "../db/chunkStore";
import { produce } from "immer";
import { Buffer } from "buffer";

// Create a singleton store instance
// let chunkStoreInstance = {
//     chunkStore: null,
//     currentChunkSet: null
// };

export const receivedFileAck = async (data: any, socket: any, setReceivedFiles: any) => {
    console.log("Starting receivedFileAck with data:", data);
    
    const { setChunkStore } = useChunkStore.getState();
    console.log("Current chunk store state:", chunkStoreInstance.chunkStore);
    
    if (chunkStoreInstance.chunkStore) {
        console.log("Chunk store already exists, cleaning up first");
        chunkStoreInstance.chunkStore = null;
    }

    if (!data?.id || !data?.totalChunks) {
        console.error("Invalid file data received:", data);
        return;
    }

    try {
        // Initialize chunk store first
        const newChunkStore = {
            id: data.id,
            totalChunks: data.totalChunks,
            name: data.name,
            size: data.size,
            mimeType: data.mimeType,
            chunkArray: new Array(data.totalChunks),
            receivedChunks: 0
        };
        console.log("Initializing new chunk store:", newChunkStore);
        
        // Update both Zustand and local instance
        chunkStoreInstance.chunkStore = newChunkStore;
        setChunkStore(newChunkStore);
        
        console.log("Verifying chunk store was set:", chunkStoreInstance.chunkStore);

        // Update received files
        setReceivedFiles((prevData: any) => produce(prevData, (draft: any) => {
            draft.push({
                ...data,
                available: false
            });
        }));

        if(!socket) {
            throw new Error("No socket available");
        }

        console.log("Requesting first chunk");
        socket.write(JSON.stringify({
            event: 'send_chunk_ack',
            chunkNo: 0
        }));
    } catch (error) {
        console.error("Error in receivedFileAck:", error);
        chunkStoreInstance.chunkStore = null;
        setChunkStore(null);
    }
}

export const sendChunkAck = async(chunkIndex: any, socket: any, setSentFiles: any, setTotalSentBytes: any) => {
    console.log(`Starting sendChunkAck for chunk ${chunkIndex}`);
    
    const { resetCurrentChunkSet } = useChunkStore.getState();
    console.log("Current chunk set in sendChunkAck:", chunkStoreInstance.currentChunkSet);
    
    if(!chunkStoreInstance.currentChunkSet) {
        console.error("No current chunk set available");
        return;
    }
    if(!socket) {
        console.error("No socket connected");
        return;
    }

    try {
        const currentChunkSet = chunkStoreInstance.currentChunkSet;
        if (!currentChunkSet.chunkArray[chunkIndex]) {
            console.error(`Chunk ${chunkIndex} not found in currentChunkSet`);
            return;
        }

        const chunk = currentChunkSet.chunkArray[chunkIndex];
        console.log(`Sending chunk ${chunkIndex + 1}/${currentChunkSet.totalChunks} (${chunk.length} bytes)`);
        
        // Send chunk data
        socket.write(JSON.stringify({
            event: 'receive_chunk_ack',
            chunk: chunk.toString('base64'),
            chunkNo: chunkIndex,
            totalChunks: currentChunkSet.totalChunks
        }));
        
        setTotalSentBytes((prevData: number) => prevData + chunk.length);

        if(chunkIndex + 1 >= currentChunkSet.totalChunks) {
            console.log('All chunks sent successfully');
            setSentFiles((prevData: any) => produce(prevData, (draft: any) => {
                const fileIndex = prevData.findIndex((f: any) => f.id === currentChunkSet?.id);
                if(fileIndex !== -1) {
                    draft[fileIndex].available = true;
                }
            }));
            // Clean up both local instance and Zustand store
            chunkStoreInstance.currentChunkSet = null;
            resetCurrentChunkSet();
        }
    } catch (error) {
        console.error('Error sending chunk:', error);
        // Clean up on error
        chunkStoreInstance.currentChunkSet = null;
        resetCurrentChunkSet();
    }
}

export const receiveChunkAck = async(chunk: any, chunkIndex: any, socket: any, setTotalReceivedBytes: any, generateFile: any) => {
    console.log(`Starting receiveChunkAck for chunk ${chunkIndex}`);
    
    const { setChunkStore } = useChunkStore.getState();
    console.log("Current chunk store in receiveChunkAck:", chunkStoreInstance.chunkStore);
    
    if(!chunkStoreInstance.chunkStore) {
        console.error("Chunk store not initialized in receiveChunkAck");
        return;
    }

    if (!chunk) {
        console.error("No chunk data received");
        return;
    }

    try {
        const store = chunkStoreInstance.chunkStore;
        console.log(`Processing chunk ${chunkIndex + 1}/${store.totalChunks}`);
        
        const chunkBuffer = Buffer.from(chunk, 'base64');
        console.log(`Chunk size: ${chunkBuffer.length} bytes`);
        
        // Update chunk array
        store.chunkArray[chunkIndex] = chunkBuffer;
        const newReceivedChunks = (store.receivedChunks || 0) + 1;
        console.log(`Updating chunk store. Total received: ${newReceivedChunks}/${store.totalChunks}`);
        
        const updatedStore = {
            ...store,
            receivedChunks: newReceivedChunks
        };
        
        // Update both Zustand and local instance
        chunkStoreInstance.chunkStore = updatedStore;
        setChunkStore(updatedStore);
        
        setTotalReceivedBytes((prevData: number) => prevData + chunkBuffer.length);

        if(!socket) {
            throw new Error('No socket available');
        }

        if(newReceivedChunks >= store.totalChunks) {
            console.log('All chunks received, generating file...');
            await generateFile();
            return;
        }

        // Request next chunk
        console.log(`Requesting chunk ${chunkIndex + 2}/${store.totalChunks}`);
        socket.write(JSON.stringify({
            event: 'send_chunk_ack',
            chunkNo: chunkIndex + 1
        }));
    } catch (error) {
        console.error('Error processing chunk:', error);
        // Clean up on error
        chunkStoreInstance.chunkStore = null;
        setChunkStore(null);
    }
}