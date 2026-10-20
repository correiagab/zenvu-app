import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gabrielcorreia.zenvu',
  appName: 'Zenvu',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#000000',
  },
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: '#000000', showSpinner: false },
  },
};

export default config;
