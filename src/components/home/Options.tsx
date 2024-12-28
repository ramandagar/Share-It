import { View, Text, TouchableOpacity } from 'react-native'
import React, { FC } from 'react'
import { optionStyles } from '../../styles/optionsStyles';
import Icon from '../global/Icon';
import { Colors } from '../../utils/Constants';
import CustomText from '../global/CustomText';
import { useTCP } from '../../service/TCPProvider';
import { navigate } from '../../utils/NavigationUtil';
import { pickDocument, pickImage } from '../../utils/libraryHelpers';

interface OptionsProps {
    isHome?: boolean;
    onMediaPickedUp?: (media: any) => void;
    onFilePickedUp?: (file: any) => void;
}

const Options: FC<OptionsProps> = ({ isHome, onMediaPickedUp, onFilePickedUp }) => {
    const {isConnected}=useTCP()
    const handleUniversalPicker = async (type: any) => {
        if(isHome){
            if(isHome){
                if(isConnected){
                    navigate('ConnectionScreen')
                }else{
                    navigate('SendScreen')
                }
                return;
            }
        }
        if(type==='images' && onMediaPickedUp){
            pickImage(onMediaPickedUp);
        }
        if(type==='file' && onFilePickedUp){
            pickDocument(onFilePickedUp);
        }
      };


    return (
        <View style={optionStyles.container} >
            <TouchableOpacity onPress={() => handleUniversalPicker('images')}>
                <Icon name='images' iconFamily='Ionicons' size={30} color={Colors.primary} />
                <CustomText fontFamily='Okra-Medium' style={{marginTop:5,textAlign:'center'}}>Photo</CustomText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleUniversalPicker('file')}>
                <Icon name='musical-notes-sharp' iconFamily='Ionicons' size={30} color={Colors.primary} />
                <CustomText fontFamily='Okra-Medium' style={{marginTop:5,textAlign:'center'}}>Audio</CustomText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleUniversalPicker('file')}>
                <Icon name='folder-open' iconFamily='Ionicons' size={30} color={Colors.primary} />
                <CustomText fontFamily='Okra-Medium' style={{marginTop:5,textAlign:'center'}}>File</CustomText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleUniversalPicker('file')}>
                <Icon name='contacts' iconFamily='MaterialIcons' size={30} color={Colors.primary} />
                <CustomText fontFamily='Okra-Medium' style={{marginTop:5,textAlign:'center'}}>Contacts</CustomText>
            </TouchableOpacity>
              
            
        </View>
    )
}

export default Options