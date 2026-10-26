import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as SQLite from 'expo-sqlite';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        const db = await SQLite.openDatabaseAsync('ndimi.db');
        await db.execAsync('PRAGMA journal_mode = WAL');
        if (!cancelled) router.replace('/onboarding/permissions');
      } catch (e) {
        console.error('Bootstrap permission error', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Starting Ndimi Swahili...</Text>
    </View>
  );
}
