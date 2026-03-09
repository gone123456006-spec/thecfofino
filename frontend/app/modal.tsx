import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { styles } from '@/styles/modal.styles';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This is a modal</Text>
      <Link href="/" dismissTo asChild>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Pressable>
      </Link>
    </View>
  );
}
