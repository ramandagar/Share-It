import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { bottomTabStyles } from '../../styles/bottomTabStyle'
import { navigate } from '../../utils/NavigationUtil' 
import Icon from '../global/Icon'
import { Colors } from '../../utils/Constants'
import QRScannerModal from '../modals/QRScannerModal'

const AbsoluteQRBottom = () => {
  const [isVisible,setVisible] = React.useState(false)
  return (
    <>
    <View style={bottomTabStyles.container}>
      <TouchableOpacity onPress={() => { navigate('ReceiveFileScreen')}}>
        <Icon name='apps-sharp' iconFamily='Ionicons' size={26} color={Colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={bottomTabStyles.qrCode} onPress={() => { setVisible(true)}}>
        <Icon name='qrcode-scan' iconFamily='MaterialCommunityIcons' size={26} color='#fff' />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { }}>
        <Icon name='beer-sharp' iconFamily='Ionicons' size={26} color={Colors.primary} />
      </TouchableOpacity>
      
    </View>
    { isVisible && <QRScannerModal visible={isVisible} onClose={() => setVisible(false)}/>}
    </>
  )
}

export default AbsoluteQRBottom