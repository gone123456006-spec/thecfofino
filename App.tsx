/**
 * This file exists so Expo can resolve the default entry (../../App) when
 * someone runs `npx expo start` from the repo root (D:\thecfo).
 *
 * The actual app runs from the frontend folder with expo-router.
 * Run the app from the frontend directory:
 *
 *   cd frontend
 *   npx expo start
 *
 * Or from repo root:  npm start
 */
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Run the app from the frontend folder</Text>
      <Text style={styles.code}>cd frontend</Text>
      <Text style={styles.code}>npx expo start</Text>
      <Text style={styles.hint}>Or from repo root: npm start</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0d1a26',
  },
  title: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 16,
    color: '#4fc3f7',
    marginVertical: 4,
  },
  hint: {
    fontSize: 14,
    color: '#90a4ae',
    marginTop: 24,
  },
});
