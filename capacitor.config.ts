import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cartasdominicanas.app',
  appName: 'Cartas Dominicanas',
  webDir: 'dist',
  backgroundColor: '#064e3b',
  android: {
    allowMixedContent: false,
  },
};

export default config;
