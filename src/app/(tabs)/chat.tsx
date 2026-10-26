import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CircleButton } from '../../components/CircleButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing, surfaceTheme, type } from '../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasChatModel, streamChat, type ChatMessage } from '../../features/chat/chatService';

type Bubble = ChatMessage & { id: string; streaming?: boolean };

const GREETING: Bubble = {
  id: 'greeting',
  role: 'assistant',
  content: 'Habari! Ask me anything — I run entirely on this phone.',
};

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Bubble[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);
  const cancelSignal = useRef({ cancelled: false });
  const model = hasChatModel();

  useEffect(() => () => { cancelSignal.current.cancelled = true; }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    setError(null);
    cancelSignal.current = { cancelled: false };

    const userBubble: Bubble = { id: `u${Date.now()}`, role: 'user', content: text };
    const replyId = `a${Date.now()}`;
    const base = [...messages, userBubble];
    setMessages([...base, { id: replyId, role: 'assistant', content: '', streaming: true }]);
    setBusy(true);

    try {
      const history = base
        .filter((m) => m.id !== 'greeting')
        .map(({ role, content }) => ({ role, content }));
      await streamChat(
        history,
        (partial) => {
          setMessages((current) =>
            current.map((m) => (m.id === replyId ? { ...m, content: partial } : m))
          );
        },
        cancelSignal.current
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'The model failed to answer.';
      setError(message);
      setMessages((current) =>
        current.map((m) => (m.id === replyId ? { ...m, content: '', streaming: false } : m))
      );
    } finally {
      setBusy(false);
      setMessages((current) =>
        current.map((m) => (m.id === replyId ? { ...m, streaming: false } : m))
      );
    }
  };

  return (
    <Screen fixed gutter={0} footerGap={0} contentStyle={styles.content}>
      <View style={styles.header}>
        <CircleButton onPress={() => router.push('/(tabs)')} accessibilityLabel="Home">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </CircleButton>
        <View style={styles.headerText}>
          <Text style={styles.title}>Assistant</Text>
          <Text style={styles.subtitle}>{model ? 'On device · Llama 3.2' : 'No chat model'}</Text>
        </View>
        <CircleButton onPress={() => router.push('/settings/models')} accessibilityLabel="Models">
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
        </CircleButton>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroller}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled">
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.role === 'user' ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, message.role === 'user' && styles.mineText]}>
                {message.content || (message.streaming ? '…' : '')}
              </Text>
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!model ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Install Llama 3.2 in Settings › Models to chat offline.
              </Text>
              <PrimaryButton
                label="Open models"
                compact
                onPress={() => router.push('/settings/models')}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.input}
            placeholder="Message the assistant…"
            placeholderTextColor={colors.secondaryText}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <CircleButton
            size={44}
            tone="solid"
            disabled={!draft.trim() || busy || !model}
            onPress={send}
            accessibilityLabel="Send">
            <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
          </CircleButton>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 0 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, gap: 1 },
  title: { ...type.h1, color: colors.text },
  subtitle: { ...type.body, fontSize: 11, color: colors.secondaryText },
  thread: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: '86%', borderRadius: radius.input, padding: spacing.sm + 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.red },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    ...surfaceTheme.shadow,
  },
  bubbleText: { ...type.body, fontSize: 13.5, color: colors.text },
  mineText: { color: '#FFFFFF' },
  error: { ...type.body, fontSize: 11, color: colors.danger },
  empty: { gap: spacing.sm, marginTop: spacing.md },
  emptyText: { ...type.body, color: colors.secondaryText },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    ...type.body,
    fontSize: 13.5,
    color: colors.text,
  },
});
