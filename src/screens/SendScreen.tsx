import { View, Text, Animated, Easing, SafeAreaView, TouchableOpacity, Image, Platform, Alert } from 'react-native'
import React, { FC, useEffect } from 'react'
import { useTCP } from '../service/TCPProvider';
import { goBack, navigate } from '../utils/NavigationUtil';
import DeviceInfo from 'react-native-device-info';
import dgram from 'react-native-udp'
import LinearGradient from 'react-native-linear-gradient';
import { sendStyles } from '../styles/sendStyles';
import Icon from '../components/global/Icon';
import CustomText from '../components/global/CustomText';
import BreakerText from '../components/ui/BreakerText';
import { Colors, screenWidth } from '../utils/Constants';
import LottieView from 'lottie-react-native';
import QRScannerModal from '../components/modals/QRScannerModal';
const deviceNames = ['Oppo', 'Vivo X1', 'Redmi', ]

const SendScreen: FC = () => {

    const { connectToServer, isConnected } = useTCP();
    const [isScannerVisible, setIsScannerVisible] = React.useState(false)
    const [nearbyDevices, setNearbyDevices] = React.useState<any[]>([])

    const handleScan = (data: any) => {
        const [connectionData, deviceNames] = data?.replace('tcp://', '').split('|')
        const [host, port] = connectionData.split(':')
        // connect to server
        connectToServer(host, parseInt(port, 10), deviceNames)
    }

    const listenForDevices = async () => {
        const server = await dgram.createSocket({
            type: 'udp4',
            reusePort: true,
        });
        const port = 57143; // Match receiver's port
        server.bind(port, () => {
            console.log(`UDP Server listening on port ${port}`);
            if(Platform.OS === 'ios'){
                server.setBroadcast(true);
            }
        });
        
        server.on('message', (msg, rinfo) => {
            console.log('Received UDP message:', msg.toString(), 'from:', rinfo.address);
            const [connectionData, otherDevice] = msg?.toString()?.replace('tcp://', '').split('|')
            if (!connectionData || !otherDevice) {
                console.log('Invalid message format:', msg.toString());
                return;
            }
            console.log('Parsed message - connectionData:', connectionData, 'device:', otherDevice);
            
            setNearbyDevices((prevData) => {
                const deviceExists = prevData?.some((device: any) => device.name === otherDevice)
                if (!deviceExists) {
                    const newDevice = {
                        id: `${Date.now()}_${Math.random()}`,
                        name: otherDevice,
                        image: require('../assets/icons/device.jpeg'),
                        fullAddress: msg.toString(),
                        position: getRandomPosition(100, prevData?.map((device: any) => device.position), 50),
                        scale: new Animated.Value(1),
                    }
                    console.log('Adding new device:', newDevice.name);
                    return [...prevData, newDevice]
                }
                return prevData
            })
        });

        server.on('error', (error) => {
            console.error('UDP Server error:', error);
        });

        return server;
    }

    useEffect(() => {
        let mounted = true;
        let udpServer: any = null;
        
        const setupServer = async () => {
            try {
                if (mounted) {
                    console.log('Setting up UDP server...');
                    udpServer = await listenForDevices();
                }
            } catch (error) {
                console.error('Error setting up UDP server:', error);
            }
        };
        
        setupServer();
        
        // Add some test devices for UI verification
        setNearbyDevices(deviceNames.map((name, index) => ({
            id: `test_${index}`,
            name,
            image: require('../assets/icons/device.jpeg'),
            fullAddress: `tcp://192.168.1.${index}:5713|${name}`,
            position: getRandomPosition(150, [], 50),
            scale: new Animated.Value(1),
        })));
        
        return () => {
            mounted = false;
            if (udpServer) {
                console.log('Closing UDP server...');
                udpServer.close();
            }
            setNearbyDevices([]);
        };
    }, []);

    const handleGoBack = () => {
        goBack()
    }

    const handleDevicePress = (device: any) => {
        console.log('Device pressed:', device);
        try {
            const [connectionData, deviceName] = device.fullAddress?.replace('tcp://', '').split('|');
            if (!connectionData) {
                console.error('Invalid connection data');
                Alert.alert('Connection Error', 'Invalid device data');
                return;
            }
            const [host, port] = connectionData.split(':');
            console.log('Connecting to:', { host, port, deviceName });
            
            // Ensure we have valid connection parameters
            if (!host || !port || !deviceName) {
                console.error('Missing connection parameters:', { host, port, deviceName });
                Alert.alert('Connection Error', 'Invalid connection parameters');
                return;
            }
            
            // Convert port to number and validate
            const portNumber = parseInt(port, 10);
            if (isNaN(portNumber)) {
                console.error('Invalid port number:', port);
                Alert.alert('Connection Error', 'Invalid port number');
                return;
            }
            
            connectToServer(host, portNumber, deviceName);
        } catch (error) {
            console.error('Error connecting to device:', error);
            Alert.alert('Connection Error', 'Failed to connect to device');
        }
    };

    useEffect(() => {
        if (isConnected) {
            console.log('Connected, navigating to ConnectionScreen');
            navigate('ConnectionScreen');
        }
    }, [isConnected])

    const getRandomPosition = (radius: number, existingPositions: any[] = [], minDistance: number = 50) => {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * radius;
        
        return {
            x: (Math.cos(angle) * r) / 100,
            y: (Math.sin(angle) * r) / 100
        };
    }

    useEffect(() => {
        const timer = setInterval(() => {
            if (nearbyDevices?.length < deviceNames?.length) {
                const newDevice = {
                    id: `${nearbyDevices?.length + 1}`,
                    name: deviceNames[nearbyDevices?.length],
                    image: require('../assets/icons/device.jpeg'),
                    fullAddress: `tcp://${DeviceInfo.getIpAddress()}:5713|${deviceNames[nearbyDevices?.length]}`,
                    position: getRandomPosition(300, nearbyDevices?.map((device: any) => device.position), 50),
                    scale: new Animated.Value(0),
                }
                Animated.timing(newDevice.scale, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }).start();
            } else {
                clearInterval(timer)
            }
            // setNearbyDevices((prevData) => {
            //     return prevData.map((device: any) => {
            //         device.scale.setValue(0)
            //         Animated.timing(device.scale, {
            //             toValue: 1,
            //             duration: 1000,
            //             easing: Easing.out(Easing.ease),
            //             useNativeDriver: true,
            //         }).start();
            //         return device
            //     })
            // })
        }, 2000)
        return () => {
            clearInterval(timer)
        }
    }, [nearbyDevices]) 

    const broadcastPresence = async (server: any) => {
        try {
            const deviceName = await DeviceInfo.getDeviceName();
            const message = `tcp://localhost:5713|${deviceName}`;
            const broadcastAddress = '255.255.255.255';
            
            // Broadcast every 2 seconds
            const interval = setInterval(() => {
                server.send(message, 0, message.length, 5713, broadcastAddress, (err: any) => {
                    if (err) console.error('Error broadcasting presence:', err);
                    else console.log('Broadcasting presence:', message);
                });
            }, 2000);

            // Clean up interval when component unmounts
            return () => clearInterval(interval);
        } catch (error) {
            console.error('Error in broadcastPresence:', error);
        }
    };

    return (
        <LinearGradient
            colors={['#FFFFFF', '#B689ED', '#A066E5']}
            style={sendStyles.container}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
        >
           
            <SafeAreaView />
            <TouchableOpacity onPress={handleGoBack} style={[sendStyles.backButton,{top:50}]}>
                <Icon name='arrow-back' iconFamily='Ionicons' size={20} color='black' />
            </TouchableOpacity>
            <View style={sendStyles.mainContainer}>
                <View style={sendStyles.infoContainer}>
                    <Icon name='search' iconFamily='Ionicons' size={40} color='#fff' />
                    <CustomText fontFamily='Okra-Bold' fontSize={20} color='#fff'>
                        Looking for nearby devices
                    </CustomText>
                    <CustomText fontFamily='Okra-Medium' fontSize={12} color='#fff' style={{ textAlign: 'center' }}>
                        Ensure your device hotspot is turned on and the receiver device is connected to the same network
                    </CustomText>


                    <BreakerText text='OR' />
                    <TouchableOpacity onPress={() => setIsScannerVisible(true)} style={sendStyles.qrButton}>
                        <Icon name='qrcode-scan' iconFamily='MaterialCommunityIcons' size={30} color={Colors.primary} />
                        <CustomText fontFamily='Okra-Bold' color={Colors.primary}>
                            Scan QR
                        </CustomText>
                    </TouchableOpacity>
                </View>
                <View style={sendStyles.animationContainer}>
                    <View style={sendStyles.lottieContainer}>
                        <LottieView
                            source={require('../assets/animations/scanner.json')}
                            autoPlay

                            loop
                            style={sendStyles.lottie}
                        />
                        {nearbyDevices?.map((device: any) => (
                            <Animated.View
                                key={device.id}
                                style={[
                                    sendStyles.deviceDot,
                                    { 
                                        transform: [{ scale: device.scale }],
                                        left: screenWidth/2 + (device.position?.x * screenWidth/3),
                                        top: screenWidth/2 + (device.position?.y * screenWidth/3), 
                                    },
                                ]}
                            >
                                <TouchableOpacity 
                                    onPress={() => handleDevicePress(device)}
                                    style={sendStyles.deviceButton}
                                >
                                    <Image source={device.image} style={sendStyles.deviceImage} />
                                    <CustomText fontFamily='Okra-Medium' fontSize={12} style={sendStyles.deviceName}>
                                        {device.name}
                                    </CustomText>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                    <Image source={require('../assets/images/profile.jpg')} style={sendStyles.profileImage} />
                </View>
            </View>
            {isScannerVisible && <QRScannerModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />}
        </LinearGradient>
    )
}

export default SendScreen;