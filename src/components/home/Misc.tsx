import { View, Text, StyleSheet, Image } from 'react-native'
import React from 'react'
import CustomText from '../global/CustomText'
import { Colors } from '../../utils/Constants'
import { commonStyles } from '../../styles/commonStyles'

const Misc = () => {
  return (
    <View style={styles.container}>
      <CustomText fontFamily='Okra-Medium' fontSize={12} color={Colors.text}>
        Explore
      </CustomText>
      <Image source={require('../../assets/icons/wild_robot.jpg')} style={styles.ad_banner} />
      <View style={[commonStyles.flexRowBetween,{width:'100%',marginTop:20}]}>
        <CustomText fontFamily='Okra-Medium' fontSize={22} color={Colors.text} style={styles.text}>
          # Worlds best file sharing app
        </CustomText>
        <Image source={require('../../assets/icons/share_logo.jpg')} style={{width:'35%',height:100}} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  ad_banner: {
    marginTop: 10,
    width: '100%',
    height: 120, 
    borderRadius: 10
  },
  text:{
    opacity:0.5,
    width:'56%'
  }
})

export default Misc