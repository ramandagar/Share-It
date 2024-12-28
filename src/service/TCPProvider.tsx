import React, { FC, useCallback } from "react";
import { useChunkStore, chunkStoreInstance } from "../db/chunkStore";
import TcpSocket from "react-native-tcp-socket";
import DeviceInfo from "react-native-device-info";
import {Buffer} from 'buffer'
import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import {produce} from 'immer'
import { receiveChunkAck, receivedFileAck, sendChunkAck } from "./TCPUtils";

interface TCPContextType {
    server: any;
    client: any;
    isConnected: boolean;
    connectedDevice: any;
    sentFiles: any;
    receivedFiles: any;
    totalSentBytes: number;
    totalReceivedBytes: number;
    startServer: (port: number) => Promise<any>;
    connectToServer: (host: string, port: number, deviceName: string) => void;
    sendMessage: (message: string | Buffer) => void
    sendFileAck: (file: any, type: 'file' | 'image') => void
    disconnect: () => void
}

const TCPContext = React.createContext<TCPContextType | undefined>(undefined);
export const useTCP = (): TCPContextType => {
    const context = React.useContext(TCPContext);
    if (!context) {
        throw new Error('useTCP must be used within a TCPProvider');
    }
    return context;
}

const options = {
    // keystore: require('../../tls_certs/server-keystore.p12'),
}

export const TCPProvider: FC<{ children: React.ReactNode }> = ({ children }: any) => {


    const [server, setServer] = React.useState<any>(null);
    const [client, setClient] = React.useState<any>(null);
    const [isConnected, setIsConnected] = React.useState<boolean>(false);
    const [connectedDevice, setConnectedDevice] = React.useState<any>(null);
    const [serverSocket, setServerSocket] = React.useState<any>(null);
    const [sentFiles, setSentFiles] = React.useState<any>([]);
    const [receivedFiles, setReceivedFiles] = React.useState<any>([]);
    const [totalSentBytes, setTotalSentBytes] = React.useState<number>(0);
    const [totalReceivedBytes, setTotalReceivedBytes] = React.useState<number>(0);

    const { currentChunkSet, setCurrentChunkSet, setChunkStore } = useChunkStore()

    // Start server

    const startServer = useCallback(async(port: number) => {
        console.log('Initializing server...');
        
        // First cleanup any existing server
        if (server) {
            console.log('Cleaning up existing server...');
            try {
                server.close();
                setServer(null);
                setServerSocket(null);
                setIsConnected(false);
                setConnectedDevice(null);
            } catch (error) {
                console.error('Error cleaning up server:', error);
            }
        }

        try {
            console.log('Creating TCP server...');
            
            // Create server with connection handler
            const newServer = TcpSocket.createServer((socket) => {
                console.log('New client connected');
                socket.setNoDelay(true);
                socket.setKeepAlive(true, 1000);
                socket.readableHighWaterMark = 1024 * 1024 * 1;
                socket.writableHighWaterMark = 1024 * 1024 * 1;
                setServerSocket(socket);

                socket.on('data', async (data: any) => {
                    try {
                        console.log('Raw data received:', data.toString());
                        const parsedData = JSON.parse(data.toString());
                        console.log('Server received data:', parsedData);
                        
                        if (parsedData.event === 'connect') {
                            console.log('Connect event received');
                            setIsConnected(true);
                            setConnectedDevice(parsedData.deviceName);
                            socket.write(JSON.stringify({ event: 'connect_ack', status: 'success' }));
                        }
                        else if(parsedData.event === 'file_ack') {
                            console.log('File ack event received');
                            await receivedFileAck(parsedData?.file, socket, setReceivedFiles);
                        }
                        else if(parsedData.event === 'send_chunk_ack') {
                            console.log('Send chunk ack event received');
                            await sendChunkAck(parsedData?.chunkNo, socket, setSentFiles, setTotalSentBytes);
                        }
                        else if(parsedData?.event === 'receive_chunk_ack') {
                            console.log('Receive chunk ack event received');
                            await receiveChunkAck(parsedData?.chunk, parsedData?.chunkNo, socket, setTotalReceivedBytes, generateFile);
                        }
                        else {
                            console.log('Unknown event received:', parsedData.event);
                        }
                    } catch (error) {
                        console.error('Error processing server data:', error);
                    }
                });

                socket.on('error', (error: any) => {
                    console.error('Socket error:', error);
                    setIsConnected(false);
                    setConnectedDevice(null);
                });

                socket.on('close', () => {
                    console.log('Client disconnected');
                    setIsConnected(false);
                    setConnectedDevice(null);
                    setServerSocket(null);
                });
            });

            // Handle server errors
            newServer.on('error', (error: any) => {
                console.error('Server error:', error);
                if (error.code === 'EADDRINUSE') {
                    console.log('Port already in use, trying to recover...');
                    newServer.close();
                    setTimeout(() => {
                        newServer.listen({ port, host: '0.0.0.0' });
                    }, 1000);
                }
            });

            // Start listening
            console.log('Starting server on host: 0.0.0.0 port:', port);
            await new Promise<void>((resolve, reject) => {
                try {
                    newServer.listen({ 
                        port, 
                        host: Platform.OS === 'ios' ? '127.0.0.1' : '0.0.0.0',
                        reuseAddress: true
                    }, () => {
                        console.log('Server listening');
                        resolve();
                    });
                } catch (error) {
                    console.error('Error starting server:', error);
                    reject(error);
                }
            });

            setServer(newServer);
            console.log('Server setup completed');
            return newServer;
        } catch (error) {
            console.error('Error in setUpServer:', error);
            throw error;
        }
    }, []);

    // Start client
    const connectToServer = useCallback((host: string, port: number, deviceName: string) => {
        console.log('Attempting to connect to:', host, port, deviceName);
        try {
            // For iOS simulator, modify connection options
            const connectionOpts = {
                host: Platform.OS === 'ios' ? '127.0.0.1' : host,
                port,
                timeout: 5000
            };
            
            console.log('Connection options:', connectionOpts);
            const newClient = TcpSocket.connect(connectionOpts);

            newClient.on('connect', () => {
                console.log('Client connected successfully');
                setIsConnected(true);
                setConnectedDevice(deviceName);
                const myDeviceName = DeviceInfo.getDeviceName();
                newClient.write(JSON.stringify({ event: 'connect', deviceName: myDeviceName }));
                newClient.setNoDelay(true);
                newClient.setKeepAlive(true, 1000);
                newClient.readableHighWaterMark = 1024 * 1024 * 1;
                newClient.writableHighWaterMark = 1024 * 1024 * 1;
            });

            newClient.on('data', async (data) => {
                try {
                    console.log('Raw data received:', data.toString());
                    const parsedData = JSON.parse(data.toString());
                    console.log('Received data:', parsedData);

                    // Use else if to ensure only one event is handled
                    if (parsedData.event === 'file_ack') {
                        console.log('File ack event received');
                        await receivedFileAck(parsedData?.file, newClient, setReceivedFiles);
                    }
                    else if (parsedData.event === 'send_chunk_ack') {
                        console.log('Send chunk ack event received');
                        await sendChunkAck(parsedData?.chunkNo, newClient, setSentFiles, setTotalSentBytes);
                    }
                    else if (parsedData?.event === 'receive_chunk_ack') {
                        console.log('Receive chunk ack event received');
                        await receiveChunkAck(parsedData?.chunk, parsedData?.chunkNo, newClient, setTotalReceivedBytes, generateFile);
                    }
                    else {
                        console.log('Unknown event received:', parsedData.event);
                    }
                } catch (error) {
                    console.error('Error processing received data:', error);
                }
            });

            newClient.on('error', (error: any) => {
                console.error('Client socket error:', error);
                setIsConnected(false);
                setConnectedDevice(null);
            });

            newClient.on('close', () => {
                console.log('Client socket closed');
                setIsConnected(false);
                setConnectedDevice(null);
            });

            setClient(newClient);
        } catch (error) {
            console.error('Error creating client:', error);
            Alert.alert('Connection Error', 'Failed to connect to the device. Please try again.');
        }
    }, []);

    // disconnect

    const disconnect = useCallback(() => {
        console.log('Disconnecting...');
        try {
            if (client) {
                client.destroy();
                setClient(null);
            }
            if (serverSocket) {
                serverSocket.destroy();
                setServerSocket(null);
            }
            if (server) {
                server.close();
                setServer(null);
            }
            setIsConnected(false);
            setConnectedDevice(null);
            setReceivedFiles([]);
            setSentFiles([]);
            setTotalReceivedBytes(0);
            setTotalSentBytes(0);
            const { resetChunkStore, resetCurrentChunkSet } = useChunkStore.getState();
            resetChunkStore();
            resetCurrentChunkSet();
        } catch (error) {
            console.error('Error during disconnect:', error);
        }
    }, [client, server, serverSocket]);

    // send message
    const sendMessage = useCallback((message: string | Buffer) => {
        if (client) {
            client.write(JSON.stringify(message));
            console.log('sent from client', message)
        }else if(server){
            serverSocket.write(JSON.stringify(message));
            console.log('sent from server', message)
        }else{
            console.log('No Client or Server Connected')
        }
    }, [client, serverSocket]);

    const sendFileAck = useCallback(async (file: any, type: 'file' | 'image') => {
        console.log('Sending file:', file);
        try {
            if (!client) {
                console.error('No client connection available');
                return;
            }

            if (chunkStoreInstance.currentChunkSet) {
                console.error('Already sending a file');
                return;
            }

            const fileId = uuidv4();
            console.log('Reading file:', file.uri);
            const fileContent = await RNFS.readFile(file.uri, 'base64');
            console.log('File content read, length:', fileContent.length);
            
            const fileBuffer = Buffer.from(fileContent, 'base64');
            console.log('File buffer created, size:', fileBuffer.length);
            
            const chunkSize = 64 * 1024; // 64KB chunks
            const totalChunks = Math.ceil(fileBuffer.length / chunkSize);
            
            console.log(`File size: ${fileBuffer.length} bytes, Total chunks: ${totalChunks}, Chunk size: ${chunkSize}`);
            
            const chunks = [];
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, fileBuffer.length);
                const chunk = fileBuffer.slice(start, end);
                chunks.push(chunk);
                console.log(`Created chunk ${i + 1}/${totalChunks}, size: ${chunk.length}`);
            }
            
            console.log('All chunks created:', chunks.length);
            
            // Set current chunk set
            const newChunkSet = {
                id: fileId,
                totalChunks,
                chunkArray: chunks,
                sentChunks: 0,
                fileType: type,
                fileName: file.fileName || `file_${Date.now()}`,
                fileSize: fileBuffer.length,
                mimeType: file.type || 'application/octet-stream'
            };
            
            console.log('Setting chunk set:', { ...newChunkSet, chunkArray: '[...]' });
            
            // Update both local instance and Zustand store
            chunkStoreInstance.currentChunkSet = newChunkSet;
            setCurrentChunkSet(newChunkSet);
            
            console.log('Current chunk set initialized');

            // Update sent files list
            setSentFiles((prevData: any) => produce(prevData, (draft: any) => {
                draft.push({
                    id: fileId,
                    name: file.fileName || `file_${Date.now()}`,
                    size: fileBuffer.length,
                    mimeType: file.type || 'application/octet-stream',
                    totalChunks,
                    available: false
                });
            }));

            // Send file acknowledgment
            console.log('Sending file acknowledgment');
            const ackData = {
                event: 'file_ack',
                file: {
                    id: fileId,
                    name: file.fileName || `file_${Date.now()}`,
                    size: fileBuffer.length,
                    mimeType: file.type || 'application/octet-stream',
                    totalChunks,
                    type: type
                }
            };
            console.log('Sending ack data:', ackData);
            client.write(JSON.stringify(ackData));
            
        } catch (error) {
            console.error('Error sending file:', error);
            Alert.alert('Error', 'Failed to send file');
            // Clean up on error
            chunkStoreInstance.currentChunkSet = null;
            const { resetCurrentChunkSet } = useChunkStore.getState();
            resetCurrentChunkSet();
        }
    }, [client]);

// Generate File
const generateFile = async () => {
    console.log('Starting file generation');
    try {
        const store = chunkStoreInstance.chunkStore;
        if (!store) {
            console.error('No chunk store available');
            return;
        }

        console.log('Combining chunks:', store.chunkArray.length);
        const combinedBuffer = Buffer.concat(store.chunkArray);
        console.log('Combined buffer size:', combinedBuffer.length);

        // Get the downloads directory
        const downloadsDir = Platform.OS === 'ios' 
            ? `${RNFS.DocumentDirectoryPath}/Downloads`
            : RNFS.DownloadDirectoryPath;

        // Create downloads directory if it doesn't exist
        await RNFS.mkdir(downloadsDir);

        // Get file extension from MIME type
        const getExtension = (mimeType: string) => {
            const mimeToExt: { [key: string]: string } = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'application/pdf': 'pdf',
                'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                'application/vnd.ms-excel': 'xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                'text/plain': 'txt',
                'application/json': 'json',
                'application/xml': 'xml',
                'application/zip': 'zip',
                'video/mp4': 'mp4',
                'audio/mpeg': 'mp3'
            };
            return mimeToExt[mimeType] || 'bin';
        };

        // Generate filename
        const timestamp = new Date().getTime();
        const extension = getExtension(store.mimeType);
        const originalName = store.name?.split('.')[0] || 'received';
        const filename = `${originalName}_${timestamp}.${extension}`;
        const filePath = `${downloadsDir}/${filename}`;

        console.log('Writing file to:', filePath);
        await RNFS.writeFile(filePath, combinedBuffer.toString('base64'), 'base64');
        console.log('File written successfully');

        // Update received files to mark as available
        setReceivedFiles((prevData: any) => produce(prevData, (draft: any) => {
            const fileIndex = draft.findIndex((f: any) => f.id === store.id);
            if (fileIndex !== -1) {
                draft[fileIndex] = {
                    ...draft[fileIndex],
                    available: true,
                    path: filePath,
                    extension
                };
            }
        }));

        // Clean up chunk store
        const { resetChunkStore } = useChunkStore.getState();
        chunkStoreInstance.chunkStore = null;
        resetChunkStore();

        Alert.alert('Success', `File saved as ${filename}`);
    } catch (error) {
        console.error('Error generating file:', error);
        Alert.alert('Error', 'Failed to generate file');
    }
}   

    return (
        <TCPContext.Provider value={{
            server,
            client,
            isConnected,
            connectedDevice,
            sentFiles,
            receivedFiles,
            totalSentBytes,
            totalReceivedBytes,
            startServer,
            connectToServer,
            disconnect,
            sendMessage,
            sendFileAck,

        }}>
            {children}
        </TCPContext.Provider>
    )
}