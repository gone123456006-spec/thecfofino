import { Text, View } from 'react-native';
import { styles } from '@/styles/placeholder.styles';

export default function CabinetScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cabinet</Text>
      <Text style={styles.subtitle}>Your files and saved documents appear here.</Text>
    </View>
  );
}
