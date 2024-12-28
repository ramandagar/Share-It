import { View, Text ,TextStyle, Platform, StyleSheet} from 'react-native'
import React, { FC } from 'react'
import { RFValue } from 'react-native-responsive-fontsize';
import { Colors } from '../../utils/Constants';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7'
type PlatformType = "android" | "ios"

interface CustomTextProps {
    variant?:Variant;
    fontFamily?:
    "Okra-Bold" |
    "Okra-ExtraBold" |
    "Okra-Medium" |
    "Okra-MediumLight" |
    "Okra-Regular";
    color?:string;
    fontSize?:number;
    style?:TextStyle | TextStyle[];
    children?:React.ReactNode;
    numberOfLines?:number;
    onLayout?:(event:any) => void;
}


const fontSizeMap:Record<Variant,Record<PlatformType,number>> = {
    h1:{android:24,ios:22},
    h2:{android:22,ios:20},
    h3:{android:20,ios:18},
    h4:{android:18,ios:16},
    h5:{android:16,ios:14},
    h6:{android:14,ios:12},
    h7:{android:12,ios:10},
}

const CustomText:FC<CustomTextProps> = ({
    variant,
    fontFamily="Okra-Regular",
    fontSize,
    color,
    style,
    children,
    numberOfLines,
    onLayout,
    ...props
}) => {
    let computedFontSize:number = Platform.OS==='android'? RFValue(fontSize  || 10) :RFValue(fontSize  || 12);

    if(variant && fontSizeMap[variant]) {
        computedFontSize = Platform.OS==='android'? RFValue(fontSizeMap[variant].android) :RFValue(fontSizeMap[variant].ios);
    }

    const fontFamilyStyle = {
        fontFamily
    }
  return (
      <Text style={[styles.text,{color:color || Colors.text,fontSize:computedFontSize},fontFamilyStyle,style]} {...props} numberOfLines={numberOfLines!==undefined?numberOfLines:undefined} onLayout={onLayout} {...props}>
        {children}
      </Text>
  )
}

const styles = StyleSheet.create({
    text:{
        textAlign:'left',
    }
})

export default CustomText