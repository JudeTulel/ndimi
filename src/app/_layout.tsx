import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { getDatabase } from '../core/db/database';

export default function RootLayout() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getDatabase();
        await Audio.requestPermissionsAsync();
        if (!cancelled) router.replace('/onboarding/permissions');
      } catch (e) {
        console.error('Bootstrap permission error', e);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {booting && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
          }}>
          <Text>Starting Ndimi Swahili...</Text>
        </View>
      )}
    </>
  );
}
