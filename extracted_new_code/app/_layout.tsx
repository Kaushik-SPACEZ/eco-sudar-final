import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrderProvider } from '@/contexts/OrderContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <OrderProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="product-selection" />
              <Stack.Screen name="user-details" />
              <Stack.Screen name="order-summary" />
            </Stack>
          </OrderProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
