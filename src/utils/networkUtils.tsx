import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { NetworkInfo } from 'react-native-network-info';

export const getLocalIPAddress = async (): Promise<string> => {
    try {
        if (Platform.OS === 'ios') {
            // For iOS simulator, use loopback address
            return '127.0.0.1';
        }
        
        // Try getting IP from NetworkInfo first
        const gateway = await NetworkInfo.getIPV4Address();
        if (gateway && gateway !== '0.0.0.0') {
            console.log("IP ADDRESS (NetworkInfo):", gateway);
            return gateway;
        }

        // Fallback to DeviceInfo
        const deviceIP = await DeviceInfo.getIpAddress();
        if (deviceIP && deviceIP !== '0.0.0.0') {
            console.log("IP ADDRESS (DeviceInfo):", deviceIP);
            return deviceIP;
        }

        console.log("Using default IP: 127.0.0.1");
        return '127.0.0.1';
    } catch (error) {
        console.error('Error getting IP address:', error);
        return '127.0.0.1';
    }
};

function setLastBlockTo255(ip: string): string {
    if (ip === '127.0.0.1') return '127.0.0.1';
    const parts = ip.split('.').map(Number);
    parts[3] = 255;
    return parts.join('.');
}

export const getBroadcastIPAddress = async (): Promise<string> => {
    try {
        if (Platform.OS === 'ios') {
            // For iOS simulator, use loopback
            return '127.0.0.1';
        }

        const ip = await getLocalIPAddress();
        const broadcastAddress = setLastBlockTo255(ip);
        console.log('Broadcast Address:', broadcastAddress);
        return broadcastAddress;
    } catch (error) {
        console.error('Error getting broadcast address:', error);
        return '127.0.0.1';
    }
};
