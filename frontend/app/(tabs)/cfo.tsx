import { Text, View } from 'react-native';
import { styles } from '@/styles/placeholder.styles';

export default function CfoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CFO</Text>
      <Text style={styles.subtitle}>Personal CFO dashboard and services appear here.</Text>
    </View>
  );
}
