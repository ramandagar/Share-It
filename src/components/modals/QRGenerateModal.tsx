import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import React, { FC, useEffect, useMemo } from 'react'
import { modalStyles } from '../../styles/modalStyles'
import Icon from '../global/Icon'
import { Colors, multiColor } from '../../utils/Constants'
import CustomText from '../global/CustomText'
import { Camera, CodeScanner, useCameraDevice } from 'react-native-vision-camera'
import Animated, {
    useSharedValue,
    Easing,
    withTiming,
    useAnimatedStyle,
    withRepeat
} from 'react-native-reanimated'
import { LinearGradient } from 'react-native-linear-gradient'
import QRCode from 'react-native-qrcode-svg'
import DeviceInfo from 'react-native-device-info'
import { useTCP } from '../../service/TCPProvider'
import { navigate } from '../../utils/NavigationUtil'
import { getLocalIPAddress } from '../../utils/networkUtils'


interface QRScannerModalProps {
    visible: boolean,
    onClose: () => void
}

const QRGenerateModal: FC<QRScannerModalProps> = ({
    visible,
    onClose
}) => {
    const {startServer,server,isConnected} = useTCP();
    const [loading, setLoading] = React.useState(true)
    const [qrValue, setQrValue] = React.useState('Raman Dagar')

    const shimmerTranlateX = useSharedValue(-300)



    const shimmerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shimmerTranlateX.value }]
        }
    })

    useEffect(() => {
        setLoading(false);
    }, [visible])

    const setUpServer = async () => {
        const deviceName = await DeviceInfo.getDeviceName()
        setLoading(false)
        const ip = await getLocalIPAddress();
        const port = 4000;
        if(server){
         
            setQrValue(`tcp://${ip}:${port}|${deviceName}`)
            setLoading(false)
            return
            // startServer(port)
        }
        startServer(port)
        setQrValue(`tcp://${ip}:${port}|${deviceName}`)
        console.log(`Server Info: ${ip}:${port}|${deviceName}`)
        setLoading(false)
    }

    useEffect(() => {
        shimmerTranlateX.value = withRepeat(
            withTiming(300, {
                duration: 1000,
                easing: Easing.linear
            }),
            -1,
            false
        )
        if(visible){
            setLoading(true)
            setUpServer()
        }
    }, [visible])



useEffect(() => {
    if(isConnected){
        onClose()
        navigate('ConnectionScreen')
    }
}, [isConnected])

    return (
        <Modal
            animationType='slide'
            presentationStyle='formSheet'
            onDismiss={onClose}
            onRequestClose={onClose}
            visible={visible}>
            <View style={modalStyles.modalContainer}>
                <View style={modalStyles.qrContainer}>
                    {loading || qrValue === null || qrValue === '' ?
                        (<View style={modalStyles.skeleton}>
                            <Animated.View  style={[modalStyles.shimmerOverlay, shimmerStyle]}>
                                <LinearGradient colors={['#e6e6e6', '#f5f5f5', '#e6e6e6']} style={modalStyles.shimmerGradient}>

                                </LinearGradient>
                            </Animated.View>
                        </View>) :
                        (
                            <>
                                <QRCode
                                    value={qrValue}
                                    size={250}
                                    logoSize={30}
                                    logoMargin={2}
                                    logoBackgroundColor='#fff'
                                    logoBorderRadius={15}
                                    logo={require('../../assets/images/profile2.jpg')}
                                    linearGradient={multiColor}
                                    enableLinearGradient
                                />
                            </>
                        )
                    }
                </View>

                <View style={modalStyles.info}>
                    <CustomText fontFamily='Okra-Medium' fontSize={20} color={Colors.text} style={modalStyles.infoText1}>
                        Ensure you are on same wifi network
                    </CustomText>
                    <CustomText fontFamily='Okra-Medium' fontSize={20} color={Colors.text} style={modalStyles.infoText2}>
                        Ask the sender to scan the QR code
                    </CustomText>
                    <CustomText fontFamily='Okra-Medium' fontSize={16} color={Colors.text}>
                        Scan the QR code to start sharing.</CustomText>
                </View>
                <ActivityIndicator size='small' style={{ alignSelf: 'center' }} color='#fff' />
                <TouchableOpacity style={[modalStyles.closeButton]} onPress={() => onClose()}>
                    <Icon name='close' iconFamily='Ionicons' size={20} color='#000' />
                </TouchableOpacity>
            </View>
        </Modal>
    )
}

export default QRGenerateModal