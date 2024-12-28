import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import React, { FC, useEffect, useMemo } from 'react'
import { modalStyles } from '../../styles/modalStyles'
import Icon from '../global/Icon'
import { Colors } from '../../utils/Constants'
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
import { useTCP } from '../../service/TCPProvider'
import { navigate } from '../../utils/NavigationUtil'


interface QRScannerModalProps {
  visible: boolean,
  onClose: () => void
}

const QRScannerModal: FC<QRScannerModalProps> = ({
  visible,
  onClose
}) => {
  const {connectToServer,isConnected} = useTCP();
  const [loading, setLoading] = React.useState(true)
  const [codeFound, setCodeFound] = React.useState(false)
  const [hasPermission, setHasPermission] = React.useState(false)
  const device = useCameraDevice('back') as any
  const shimmerTranlateX = useSharedValue(-300)



  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerTranlateX.value }]
    }
  })

  useEffect(() => {
    const checkPermission = async () => {
      const status = await Camera.requestCameraPermission()
      setHasPermission(status === 'granted')
    }
    checkPermission()
    if (visible) {
      setLoading(true)
      const timer = setTimeout(() => {
        setLoading(false)
        setCodeFound(true)
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible])

  useEffect(() => {
    shimmerTranlateX.value = withRepeat(
      withTiming(300, {
        duration: 1000,
        easing: Easing.linear
      }),
      -1,
      false
    )
  }, [loading])

  const handleScan = (data: any) => {
    const [connectionData, deviceName] = data?.replace('tcp://', '').split('|')
    const [host, port] = connectionData.split(':')
    // connect to server
    connectToServer(host, parseInt(port,10), deviceName)
  }

  const codeScanner = useMemo<CodeScanner>(() => ({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codeFound) {
        return
      }
      console.log(`Scanned ${codes?.length}`)
      if (codes?.length > 0) {
        const ScannedData = codes[0]?.value
        console.log(ScannedData)
        setCodeFound(true)
        handleScan(ScannedData)
      }
    }
  }), [codeFound, ])


  useEffect(() => {
    if (isConnected) {
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
          {loading ?
            (<View style={modalStyles.skeleton}>
              <Animated.View style={[modalStyles.shimmerOverlay, shimmerStyle]}>

                <LinearGradient colors={['#e6e6e6', '#f5f5f5', '#e6e6e6']} style={modalStyles.shimmerGradient}>

                </LinearGradient>
              </Animated.View>
            </View>) :
            (
              <>
                {(!device || !hasPermission) ? (
                  <View style={modalStyles.skeleton}>
                    <Image source={require('../../assets/images/no_camera.png')} style={modalStyles.noCameraImage} />
                  </View>
                ) : (
                  <View style={modalStyles.skeleton}>
                    <Camera style={modalStyles.camera} device={device} isActive={visible} codeScanner={codeScanner} />
                  </View>
                )}
              </>
            )
          }
        </View>

        <View style={modalStyles.info}>
          <CustomText fontFamily='Okra-Medium' fontSize={20} color={Colors.text} style={modalStyles.infoText1}>
            Ensure you are on same wifi network
          </CustomText>
          <CustomText fontFamily='Okra-Medium' fontSize={20} color={Colors.text} style={modalStyles.infoText2}>
            Ask the receiver to scan the QR code
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

export default QRScannerModal