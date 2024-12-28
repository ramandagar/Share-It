import { View, Text } from 'react-native'
import React, { FC } from 'react'
import {RFValue} from 'react-native-responsive-fontsize'
import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface IconProps {
    name: string;
    size: number;
    color: string;
    iconFamily:"Ionicons" | "MaterialIcons" | "MaterialCommunityIcons"
}

const Icon:FC<IconProps> = ({name, size, color, iconFamily}: IconProps) => {
  return (
    <>
    {iconFamily==='Ionicons' && <Ionicons name={name} size={RFValue(size)} color={color} />}
    {iconFamily==='MaterialIcons' && <MaterialIcons name={name} size={size} color={color} />}
    {iconFamily==='MaterialCommunityIcons' && <MaterialCommunityIcons name={name} size={size} color={color} />}
    </>
  )
}

export default Icon