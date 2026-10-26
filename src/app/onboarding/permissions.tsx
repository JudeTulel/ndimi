import { useState } from 'react';
import { Text, View, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';

export default function OnboardingPermissions() {
  const router = useRouter();
  const [status, setStatus] = useState('Checking permissions');

  const ensure = async () => {
    setStatus('Requesting permissions');
    const mic = await Audio.requestPermissionsAsync();
    if (mic.status === 'granted') {
      router.replace('/onboarding/models');
      return;
    }
    setStatus('Microphone permission is required to record voice translations.');
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Ndimi needs permissions</Text>
      <Text>Microphone access is required for voice translation. Device info is used for runtime compatibility only.</Text>
      <Text>{status}</Text>
      <Button title="Grant microphone access" onPress={ensure} />
    </View>
  );
}
