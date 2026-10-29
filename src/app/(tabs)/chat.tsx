import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CircleButton } from '../../components/CircleButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing, surfaceTheme, type } from '../../theme/tokens';
import {
  hasChatModel,
  loadActiveChatModel,
  streamChat,
  subscribeActiveChat,
  type ChatMessage,
} from '../../features/chat/chatService';
import { runAgentTurn } from '../../features/agent/agentService';
import { accessibilityReady, openAccessibilitySettings } from '../../features/agent/ussd';
import { useKeyboardHeight } from '../../core/ui/useKeyboardHeight';

type Bubble = ChatMessage & { id: string; streaming?: boolean; steps?: string };

/**
 * Chat answers questions; Agent drives the phone. The two differ in prompt,
 * suggestions and composer wording, so the mode is a first-class piece of state
 * rather than a flag hidden in a message.
 */
type Mode = 'chat' | 'agent';

/** Tab bar height (62) plus its bottom margin (10), so the composer clears it. */
const TAB_BAR_CLEARANCE = 72;

const MODES: { key: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'chat', label: 'Chat', icon: 'chatbubble-ellipses-outline' },
  { key: 'agent', label: 'Agent', icon: 'hardware-chip-outline' },
];

function greetingQuestion(mode: Mode): string {
  return mode === 'chat' ? 'How can I help you?' : 'What should I do?';
}

function partOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * One-tap starts, tuned per mode: prompts in chat, real jobs in agent.
 */
const SUGGESTIONS: Record<Mode, string[]> = {
  chat: [
    'Explain photosynthesis simply',
    'Write a polite leave request',
    'Translate “good morning” to Swahili',
    'Draft a text to my landlord',
  ],
  agent: ['Call 0722 000 000', 'Send an SMS to Mum', 'Lipa na mpesa (*334#)', 'What time is it?'],
};

export default function Assistant() {
  const router = useRouter();
  const keyboard = useKeyboardHeight();
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [a11y, setA11y] = useState<boolean | null>(null);
  const scroller = useRef<ScrollView>(null);
  const cancelSignal = useRef({ cancelled: false });
  const [, forceRender] = useState(0);
  const model = hasChatModel();

  useEffect(() => {
    // The chosen model lives in a preference; load it once, then repaint whenever the
    // Settings screen switches it so the header keeps telling the truth.
    void loadActiveChatModel();
    return subscribeActiveChat(() => forceRender((n) => n + 1));
  }, []);

  useEffect(() => () => { cancelSignal.current.cancelled = true; }, []);

  // The service can be switched on outside the app, so it is re-checked whenever the
  // screen comes back to agent mode rather than only once on mount.
  useEffect(() => {
    if (mode !== 'agent') return;
    let live = true;
    void accessibilityReady()
      .then((on) => live && setA11y(on))
      .catch(() => live && setA11y(null));
    return () => {
      live = false;
    };
  }, [mode]);

  const stop = () => {
    cancelSignal.current.cancelled = true;
  };

  const send = async (prefill?: string) => {
    const text = (prefill ?? draft).trim();
    if (!text || busy) return;
    setDraft('');
    setError(null);
    cancelSignal.current = { cancelled: false };
    const agent = mode === 'agent';

    const userBubble: Bubble = { id: `u${Date.now()}`, role: 'user', content: text };
    const replyId = `a${Date.now()}`;
    const base = [...messages, userBubble];
    setMessages([...base, { id: replyId, role: 'assistant', content: '', streaming: true }]);
    setBusy(true);

    try {
      const history = base.map(({ role, content }) => ({ role, content }));

      if (agent) {
        // The model streams JSON, which is noise in a bubble. Only the `say` value is
        // painted, and a partial that has not reached it yet leaves the placeholder.
        const turn = await runAgentTurn(history, cancelSignal.current, (partial) => {
          const spoken = /"say"\s*:\s*"([^"]*)/.exec(partial)?.[1];
          if (!spoken) return;
          setMessages((current) =>
            current.map((m) => (m.id === replyId ? { ...m, content: spoken } : m))
          );
        });
        setMessages((current) =>
          current.map((m) =>
            m.id === replyId ? { ...m, content: turn.say, steps: turn.steps } : m
          )
        );
        return;
      }

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
    <Screen fixed gutter={0} footerGap={0} contentStyle={styles.content} tabBar={false} ownBottom>
      <View style={styles.header}>
        <CircleButton onPress={() => router.push('/(tabs)')} accessibilityLabel="Home">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </CircleButton>
        <View style={styles.headerText}>
          <Text style={styles.title}>Assistant</Text>
          <Text style={styles.subtitle}>{model ? `On device · ${model.title}` : 'No chat model'}</Text>
        </View>
        <CircleButton onPress={() => router.push('/settings/models')} accessibilityLabel="Models">
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
        </CircleButton>
      </View>

      {/* Mode switch. Chat is the default because it is the cheapest to run and the
          only one a general model can do well. */}
      <View style={styles.modes}>
        {MODES.map((option) => {
          const on = mode === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setMode(option.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.mode, on && styles.modeOn]}>
              <Ionicons
                name={option.icon}
                size={14}
                color={on ? '#FFFFFF' : colors.secondaryText}
              />
              <Text style={[styles.modeText, on && styles.modeTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.flex}>
        {mode === 'agent' && a11y === false ? (
          <Pressable
            style={styles.banner}
            onPress={() => {
              // The settings screen takes the user away; re-check on return so the
              // banner clears itself once the service is on.
              void openAccessibilitySettings();
              setTimeout(() => void accessibilityReady().then(setA11y).catch(() => {}), 1200);
            }}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.greenInk} />
            <Text style={styles.bannerText}>
              Turn on Ndimi in Accessibility settings to let the agent use USSD menus.
            </Text>
          </Pressable>
        ) : null}
        <ScrollView
          ref={scroller}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <>
              <View style={styles.greeting}>
                <Text style={styles.hello}>Hello, good {partOfDay()}.</Text>
                <Text style={styles.question}>{greetingQuestion(mode)}</Text>
              </View>
              <Text style={styles.suggestLabel}>SUGGESTIONS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}>
                {SUGGESTIONS[mode].map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => void send(suggestion)}
                    style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                    <Text style={styles.chipText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {messages.map((message) => {
            const mine = message.role === 'user';
            return (
              <View key={message.id} style={styles.row}>
                {!mine ? <Text style={styles.from}>ASSISTANT</Text> : null}
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, mine ? styles.mineText : styles.theirsText]}>
                    {message.content || (message.streaming ? '…' : '')}
                  </Text>
                  {message.steps ? <Text style={styles.steps}>{message.steps}</Text> : null}
                </View>
              </View>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!model ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Install a chat model in Settings › Models to chat offline.
              </Text>
              <PrimaryButton
                label="Open models"
                compact
                onPress={() => router.push('/settings/models')}
              />
            </View>
          ) : null}
        </ScrollView>

        {/* `Screen` already shortens the viewport by the keyboard height, so the
            composer only adds what the keyboard does not cover: a flat gap while
            typing, and clearance over the floating tab bar when it is closed. The
            safe-area inset is not added back — the tab bar owns that space. */}
        <View
          style={[
            styles.composer,
            { paddingBottom: keyboard > 0 ? spacing.sm : TAB_BAR_CLEARANCE + spacing.xs },
          ]}>
          <TextInput
            style={styles.input}
            placeholder={mode === 'chat' ? 'Message the assistant…' : 'Tell me what to do…'}
            placeholderTextColor={colors.secondaryText}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!busy}
          />
          {/* Same slot swaps role: stop while a reply streams, send otherwise. The
              field is disabled during a run, so these never both apply. */}
          <CircleButton
            size={44}
            tone="solid"
            disabled={busy ? false : !draft.trim() || !model}
            onPress={busy ? stop : () => void send()}
            accessibilityLabel={busy ? 'Stop response' : 'Send'}>
            <Ionicons name={busy ? 'stop' : 'arrow-up'} size={19} color="#FFFFFF" />
          </CircleButton>
        </View>
      </View>
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
  subtitle: { ...type.body, fontSize: 11, color: colors.green },
  modes: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.sm,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
  },
  modeOn: { backgroundColor: colors.dark, ...surfaceTheme.shadow },
  modeText: { ...type.label, fontSize: 11, color: colors.secondaryText },
  modeTextOn: { color: '#FFFFFF' },
  thread: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.greenWash,
    borderWidth: 1,
    borderColor: colors.successSoft,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  bannerText: { ...type.body, fontSize: 11, color: colors.greenInk, flex: 1 },
  greeting: { gap: 2, marginBottom: spacing.sm },
  hello: { ...type.hero, color: colors.secondaryText, fontFamily: type.body.fontFamily },
  question: { ...type.hero, color: colors.greenInk },
  suggestLabel: { ...type.label, fontSize: 10, color: colors.text, letterSpacing: 1.2 },
  chips: { gap: spacing.sm, paddingRight: spacing.lg, paddingVertical: spacing.xs },
  chip: {
    maxWidth: 210,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    ...surfaceTheme.shadow,
  },
  chipPressed: { opacity: 0.85 },
  chipText: { ...type.cardTitle, fontSize: 12.5, color: colors.text },
  row: { gap: 3 },
  from: { ...type.label, fontSize: 9, color: colors.green, marginLeft: spacing.xs },
  bubble: { maxWidth: '86%', borderRadius: radius.input, padding: spacing.sm + 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.red },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.successSoft,
    ...surfaceTheme.shadow,
  },
  bubbleText: { ...type.body, fontSize: 13.5, color: colors.text },
  mineText: { color: '#FFFFFF' },
  // Green on the assistant side only: it marks the machine voice without tinting
  // body copy the user typed.
  theirsText: { color: colors.greenInk },
  steps: {
    ...type.body,
    fontSize: 10.5,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  error: { ...type.body, fontSize: 11, color: colors.danger },
  empty: { gap: spacing.sm, marginTop: spacing.md },
  emptyText: { ...type.body, color: colors.secondaryText },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  // Floating field: no band behind it and no frame around it, so the composer reads
  // as part of the cream page rather than a boxed-off strip.
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    ...type.body,
    fontSize: 13.5,
    color: colors.text,
    ...surfaceTheme.shadow,
  },
});
