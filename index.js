/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log(
    '[FCM] Background message:',
    remoteMessage?.messageId,
    remoteMessage?.data,
  );
});

AppRegistry.registerComponent(appName, () => App);
