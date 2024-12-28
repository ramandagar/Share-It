import { View, Text, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native'
import React, { useEffect } from 'react'
import { useTCP } from '../service/TCPProvider'
import Icon from '../components/global/Icon'
import LinearGradient from 'react-native-linear-gradient'
import { sendStyles } from '../styles/sendStyles'
import { connectionStyles } from '../styles/connectionStyles'
import CustomText from '../components/global/CustomText'
import Options from '../components/home/Options'
import { goBack, navigate, resetAndNavigate } from '../utils/NavigationUtil'
import { formatFileSize } from '../utils/libraryHelpers'
import ReactNativeBlobUtil from 'react-native-blob-util'

const ConnectionScreen = () => {
  const {
    connectedDevice,
    disconnect,
    sendFileAck,
    sentFiles,
    receivedFiles,
    totalSentBytes,
    totalReceivedBytes,
    startServer,
    connectToServer,
    sendMessage,
    isConnected,
  } = useTCP()
  const [activeTab, setActiveTab] = React.useState<'SENT' | 'RECEIVED'>('SENT')

  const renderThumbnail = (mimeType: string) => {
    switch (mimeType) {
      case '.mp3':
        return <Icon name='musical-notes' color='blue' size={30} iconFamily='Ionicons' />
      case '.mp4':
        return <Icon name='videocam' color='green' size={30} iconFamily='Ionicons' />
      case '.jpg':
        return <Icon name='image' color='orange' size={30} iconFamily='Ionicons' />
      case '.jpeg':
        return <Icon name='image' color='orange' size={30} iconFamily='Ionicons' />
      case '.png':
        return <Icon name='image' color='orange' size={30} iconFamily='Ionicons' />
      case '.pdf':
        return <Icon name='document' color='red' size={30} iconFamily='Ionicons' />
      default:
        return <Icon name='folder' color='gray' size={30} iconFamily='Ionicons' />
    }
  }

  const onMediaPickedUp = (file: any) => {
    sendFileAck(file, 'image')
  }
  const onFilePickedUp = (file: any) => {
    sendFileAck(file, 'file')
  }

  useEffect(()=>{
    if(!isConnected){
      resetAndNavigate('HomeScreen')
    }
  },[isConnected])
  
  return (
    <LinearGradient
      colors={['#FFFFFF', '#CDDAEE', '#8DBAFF']}
      style={sendStyles.container}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}>
      <SafeAreaView />

      <View style={sendStyles.mainContainer}>
        <View style={connectionStyles.container}>
          <View style={connectionStyles.connectionContainer}>
            <View style={{ width: '55%' }}>

              <CustomText numberOfLines={1} fontFamily='Okra-Medium' >
                Connected with
              </CustomText>
              <CustomText numberOfLines={1} fontFamily='Okra-Bold' >
                {connectedDevice?.name || 'Unknown Device'}
              </CustomText>
            </View>
            <TouchableOpacity onPress={() => disconnect()} style={connectionStyles.disconnectButton}>
              <Icon name='remove-circle' color='red' size={12} iconFamily='Ionicons' />
              <CustomText numberOfLines={1} fontFamily='Okra-Bold' >
                Disconnect
              </CustomText>
            </TouchableOpacity>
          </View>
          <Options onMediaPickedUp={onMediaPickedUp} onFilePickedUp={onFilePickedUp} />

          <View style={connectionStyles.fileContainer}>
            <View style={connectionStyles.sendReceiveContainer}>
              <View style={connectionStyles.sendReceiveButtonContainer}>
                <TouchableOpacity style={[connectionStyles.sendReceiveButton, activeTab === 'SENT' ? connectionStyles.activeButton : connectionStyles.inactiveButton]}
                  onPress={() => setActiveTab('SENT')}>
                  <Icon name='cloud-upload' color={activeTab === 'SENT' ? '#fff' : '#000'} size={12} iconFamily='Ionicons' />
                  <CustomText numberOfLines={1} fontFamily='Okra-Bold' fontSize={9} color={activeTab === 'SENT' ? '#fff' : '#000'}>
                    Sent
                  </CustomText>
                </TouchableOpacity>

                <TouchableOpacity style={[connectionStyles.sendReceiveButton, activeTab === 'RECEIVED' ? connectionStyles.activeButton : connectionStyles.inactiveButton]}
                  onPress={() => setActiveTab('RECEIVED')}>
                  <Icon name='cloud-upload' color={activeTab === 'RECEIVED' ? '#fff' : '#000'} size={12} iconFamily='Ionicons' />
                  <CustomText numberOfLines={1} fontFamily='Okra-Bold' fontSize={9} color={activeTab === 'RECEIVED' ? '#fff' : '#000'}>
                    Received
                  </CustomText>
                </TouchableOpacity>
              </View>
              <View style={connectionStyles.sendReceiveButtonContainer}>
                <CustomText
                  numberOfLines={1}
                  fontFamily='Okra-Bold'
                  fontSize={12}
                >
                  {formatFileSize((activeTab === 'SENT' ? totalSentBytes : totalReceivedBytes) || 0)}
                </CustomText>
                <CustomText
                  fontFamily='Okra-Bold'
                  fontSize={12}
                >
                  /
                </CustomText>
                <CustomText
                  numberOfLines={1}
                  fontFamily='Okra-Bold'
                  fontSize={12}>
                  {activeTab === 'SENT' ?
                    formatFileSize(sentFiles.reduce((total: number, file: any) => total + file.size, 0)) :
                    formatFileSize(receivedFiles.reduce((total: number, file: any) => total + file.size, 0))}
                </CustomText>
              </View>
            </View>

            {(activeTab === 'SENT' ? sentFiles.length : receivedFiles.length) > 0 ? (
              <FlatList
                data={activeTab === 'SENT' ? sentFiles : receivedFiles}
                contentContainerStyle={connectionStyles.fileList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={connectionStyles.fileItem}>
                    <View style={connectionStyles.fileInfoContainer}>
                      {renderThumbnail(item.mimeType)}
                    </View>
                    <View style={connectionStyles.fileDetails}>
                      <CustomText numberOfLines={1} fontFamily='Okra-Bold' fontSize={12}>
                        {item?.name}
                      </CustomText>
                      <CustomText numberOfLines={1} fontFamily='Okra-Regular' fontSize={10}>
                        {item?.mimeType} -  {formatFileSize(item?.size)}
                      </CustomText>
                    </View>
                    {
                      item?.available ? (
                        <TouchableOpacity onPress={() => {
                          const normalizedPath = Platform.OS==='ios'?`file://${item?.uri}`:item.uri
                          if(Platform.OS==='ios'){
                            ReactNativeBlobUtil.ios.openDocument(normalizedPath)
                            .then(() => {
                              // file opened successfully
                              console.log('File opened successfully');
                            })
                            .catch((err) => {
                              console.log(err.message);
                            });
                          }else{
                            ReactNativeBlobUtil.android.actionViewIntent(normalizedPath,'*/*')
                            .then(() => console.log('File opened successfully'))
                            .catch((err: { message: any }) => {
                              console.log(err.message);
                            });
                          }
                        }} style={connectionStyles.openButton}>
                         <CustomText numberOfLines={1} fontFamily='Okra-Bold' fontSize={12}>Open</CustomText>
                        </TouchableOpacity>
                      ) : (
                        <ActivityIndicator color='blue' size='small' />
                      )
                    }
                  </View>
                )}
                keyExtractor={(item) => item.id}
              />
            ) : (
              <View style={connectionStyles.noDataContainer}>
                <CustomText numberOfLines={1} fontFamily='Okra-Bold' fontSize={12}>
                {activeTab === 'SENT' ? 'No files sent yet' : 'No files received yet'}
                </CustomText>
              </View>
            )}

          </View>

        </View>
        <TouchableOpacity onPress={() => goBack()} style={[sendStyles.backButton]}>
          <Icon name='arrow-back' iconFamily='Ionicons' size={20} color='black' />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

export default ConnectionScreen