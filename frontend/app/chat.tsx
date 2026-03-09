import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { AIIcon } from '@/constants/assets';
import { findFAQMatch, getSuggestedQuestions } from '@/data/cfo-faq';
import { styles } from '@/styles/chat.styles';

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};

const WELCOME_MESSAGE: Message = {
  id: '0',
  role: 'bot',
  text: "Hi! I'm your CFO assistant. Ask me anything about Finovert — GST, ITR, company registration, compliance, financing, or our services.",
};

const FALLBACK_ANSWER =
  "I can help with questions about Finovert: company registration, GST, ITR, TDS, compliance, invoice financing, pricing, and support. Try asking something like 'What is Finovert?' or 'How do I register for GST?'";

const SUGGESTED = getSuggestedQuestions(6);

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);

  // AI logo: gentle pulse + opacity animation
  const aiScale = useSharedValue(1);
  const aiOpacity = useSharedValue(1);
  useEffect(() => {
    aiScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      true,
    );
    aiOpacity.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 1500 }),
        withTiming(1, { duration: 1500 }),
      ),
      -1,
      true,
    );
  }, []);

  const headerAILogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: aiScale.value }],
    opacity: aiOpacity.value,
  }));

  const sendMessage = (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!text) setInput('');
    setLoading(true);

    // Match against preloaded CFO FAQ
    setTimeout(() => {
      const match = findFAQMatch(trimmed);
      const botText = match ? match.answer : FALLBACK_ANSWER;
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: botText,
      };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 400);
  };

  const onSuggestedPress = (question: string) => {
    sendMessage(question);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Animated.View style={[styles.botAvatar, headerAILogoStyle]}>
            <Image source={AIIcon} style={styles.botAvatarImage} resizeMode="contain" accessibilityLabel="AI Assistant" />
          </Animated.View>
          <View>
            <Text style={styles.headerTitle}>CFO Assistant</Text>
            <Text style={styles.headerSubtitle}>AI • Ask anything</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          style={styles.messagesList}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.messageRow, msg.role === 'user' ? styles.messageRowUser : styles.messageRowBot]}>
              {msg.role === 'bot' && (
                <View style={styles.botAvatar}>
                  <Image source={AIIcon} style={styles.botAvatarImageSmall} resizeMode="contain" accessibilityLabel="AI" />
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <View style={styles.botAvatar}>
                <Image source={AIIcon} style={styles.botAvatarImageSmall} resizeMode="contain" accessibilityLabel="AI" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot]}>
                <Text style={styles.bubbleText}>...</Text>
              </View>
            </View>
          )}
          {/* Preloaded suggested questions */}
          <View style={styles.suggestedWrap}>
            <Text style={styles.suggestedLabel}>Suggested questions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(SUGGESTED ?? []).map((q) => (
                <Pressable
                  key={q}
                  style={styles.suggestedChip}
                  onPress={() => onSuggestedPress(q)}
                  disabled={loading}
                  accessibilityLabel={`Ask: ${q}`}>
                  <Text style={styles.suggestedChipText} numberOfLines={2}>
                    {q}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.inputWrap, { paddingBottom: 24 + insets.bottom }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about GST, ITR, services..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            editable={!loading}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
            accessibilityLabel="Send message">
            <Ionicons name="send" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
