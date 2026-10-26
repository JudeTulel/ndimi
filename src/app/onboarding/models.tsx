import { useRouter } from 'expo-router';
import { Text, View, Button } from 'react-native';

export type ModelEntry = {
  id: string;
  task: 'asr' | 'translation';
  title: string;
  sizeBytes: number;
  url: string;
};

const CATALOG: ModelEntry[] = [
  {
    id: 'whisper-swahili-small-ggml',
    task: 'asr',
    title: 'Whisper Swahili Small GGML',
    sizeBytes: 461_000_000,
    url: 'https://huggingface.co/malinali-app/whisper-swahili-small-ggml/resolve/main/ggml-model.bin',
  },
];

const MAX_RECOMMENDED = 3 * 1024 * 1024 * 1024;

export default function OnboardingModels() {
  const router = useRouter();
  const models = CATALOG.filter((m) => m.sizeBytes <= MAX_RECOMMENDED);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Choose models</Text>
      <Text>Only models under 3 GB are listed. Larger artifacts require future download support.</Text>
      {models.map((model) => (
        <View key={model.id} style={{ padding: 16, borderRadius: 16, borderWidth: 1 }}>
          <Text style={{ fontWeight: '600' }}>{model.title}</Text>
          <Text>{(model.sizeBytes / (1024 * 1024)).toFixed(0)} MB</Text>
          <Button title="Prepare" onPress={() => router.replace('/')} />
        </View>
      ))}
    </View>
  );
}

