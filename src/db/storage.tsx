import {MMKV} from 'react-native-mmkv';

export const storage = new MMKV({
    id: 'my-app-storage',
    encryptionKey: 'my-super-secret-key',
});

export const mmkvStorage = {
        setItem: (key: string, value: string) => storage.set(key, value),
        getItem: (key: string) => storage.getString(key),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clearAll(),
};

 