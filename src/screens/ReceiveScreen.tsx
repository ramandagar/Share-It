import { View, SafeAreaView, TouchableOpacity, Image, Platform } from 'react-native'
import React, { FC, useEffect } from 'react'
import { useTCP } from '../service/TCPProvider';
import { goBack, navigate } from '../utils/NavigationUtil';
import DeviceInfo from 'react-native-device-info';
import LinearGradient from 'react-native-linear-gradient';
import { sendStyles } from '../styles/sendStyles';
import Icon from '../components/global/Icon';
import CustomText from '../components/global/CustomText';
import BreakerText from '../components/ui/BreakerText';
import { Colors } from '../utils/Constants';
import LottieView from 'lottie-react-native'; 
import QRGenerateModal from '../components/modals/QRGenerateModal';
import dgram from 'react-native-udp'
import { getBroadcastIPAddress, getLocalIPAddress } from '../utils/networkUtils';
 
const ReceiveScreen: FC = () => {

    const { startServer, server, isConnected } = useTCP();
    const [qrValue, setQrValue] = React.useState<string>('');
    const intervalRef: any = React.useRef<NodeJS.Timeout | null>(null);
    const [isScannerVisible, setIsScannerVisible] = React.useState(false)
 
    const handleScan = (data: any) => {
        const [connectionData, deviceNames] = data?.replace('tcp://', '').split('|')
        const [host, port] = connectionData.split(':')
        // connect to server
        // connectToServer(host, parseInt(port, 10), deviceNames)

    }

    const setUpServer = async () => {
        try {
            console.log('Starting server setup...');
            const deviceName = await DeviceInfo.getDeviceName();
            const ip = await getLocalIPAddress();
            const port = 4000;
            
            console.log('Server configuration:', {
                deviceName,
                ip,
                port
            });

            // Start server first and wait for it
            if (!server) {
                console.log('Initializing server...');
                const newServer = await startServer(port);
                console.log('Server initialized:', newServer ? 'success' : 'failed');
                
                // Wait a bit for server to fully start
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                if (!newServer) {
                    throw new Error('Server initialization failed');
                }
            }
            
            // Only set QR value and start discovery after server is ready
            const serverAddress = `tcp://${ip}:${port}|${deviceName}`;
            console.log('Setting up server address:', serverAddress);
            setQrValue(serverAddress);
            
        } catch (error) {
            console.error('Error in setUpServer:', error);
        }
    }

    useEffect(() => {
        let mounted = true;
        
        const initServer = async () => {
            try {
                if (mounted) {
                    await setUpServer();
                    console.log('Server setup completed');
                }
            } catch (error) {
                console.error('Server initialization error:', error);
            }
        };

        initServer();
        
        return () => {
            mounted = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!qrValue || !server) {
            console.log('Skipping discovery - Server not ready', { qrValue: !!qrValue, server: !!server });
            return;
        }

        console.log('Starting discovery broadcasts...');
        sendDiscoverySignal();
        intervalRef.current = setInterval(sendDiscoverySignal, 3000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [qrValue, server]);

    const sendDiscoverySignal = async() => {
      if (!server) {
        console.log('Server not ready, skipping discovery signal');
        return;
      }

      const deviceName = await DeviceInfo.getDeviceName()
      const broadcastAddress = await getBroadcastIPAddress();
      const targetAddress = broadcastAddress || '255.255.255.255';
      const port = 57143;
      const ip = await getLocalIPAddress();
      const message = `tcp://${ip}:4000|${deviceName}`;
      console.log('Sending discovery message:', message, 'to port:', port);
      
      const client = dgram.createSocket({
        type: 'udp4',
        reusePort: true,
      });
      
      client.bind(()=>{
        try {
            if(Platform.OS === 'ios'){
              client.setBroadcast(true);
            }
            client.send(message, 0, message.length, port, targetAddress, (err: any) => {
              if (err) {
                  console.error('Error sending discovery signal:', err);
              } else {
                  console.log(`${deviceName} Discovery signal sent to ${targetAddress}:${port}:`, message);
              }
              client.close();
            });
        } catch (error) {
          client.close();
          console.error('Error sending discovery signal:', error);
        }
      })
    }

    const handleGoBack = () => {
        goBack()
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
    }

    useEffect(() => {
        if (isConnected) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
            navigate('ConnectionScreen')
        }
    }, [isConnected])

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
            colors={['#FFFFFF', '#4DA0DE', '#3387C5', '#1A5E9D']}
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
                    <Icon name='blur-on' iconFamily='MaterialIcons' size={40} color='#fff' />
                    <CustomText fontFamily='Okra-Bold' fontSize={20} color='#fff'>
                        Receiving for nearby devices
                    </CustomText>
                    <CustomText fontFamily='Okra-Medium' fontSize={12} color='#fff' style={{ textAlign: 'center' }}>
                        Ensure your device connected to sender hotspot
                    </CustomText>


                    <BreakerText text='OR' />
                    <TouchableOpacity onPress={() => setIsScannerVisible(true)} style={sendStyles.qrButton}>
                        <Icon name='qrcode-scan' iconFamily='MaterialCommunityIcons' size={30} color={Colors.primary} />
                        <CustomText fontFamily='Okra-Bold' color={Colors.primary}>
                            Show QR
                        </CustomText>
                    </TouchableOpacity>
                </View>
                <View style={sendStyles.animationContainer}>
                    <View style={sendStyles.lottieContainer}>
                        <LottieView
                            source={require('../assets/animations/scan2.json')}
                            autoPlay

                            loop
                            style={sendStyles.lottie}
                        />
                        
                    </View>
                    <Image source={require('../assets/images/profile2.jpg')} style={sendStyles.profileImage} />
                </View>
            </View>
            {isScannerVisible && <QRGenerateModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />}
        </LinearGradient>
    )
}

export default ReceiveScreen;