import { View, Text, Image } from 'react-native'
import React, { FC, useEffect } from 'react'
import { navigate } from '../utils/NavigationUtil'
import { commonStyles } from '../styles/commonStyles'

const SplashScreen:FC = () => {
    const navigateToHome = () => {
        navigate('HomeScreen')
    }

    useEffect(()=>{
        setTimeout(() => {
            navigateToHome()
        }, 2000);
    },[])
  return (
    <View style={commonStyles.container}>
        <Image source={require('../assets/images/logo.png')} style={commonStyles.img} />
    </View>
  )
}

export default SplashScreen