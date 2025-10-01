import React from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './pages/App';

async function bootstrap() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const data = await response.json();
      Amplify.configure({
        Auth: {
          region: data.region,
          userPoolId: data.userPoolId,
          userPoolWebClientId: data.userPoolClientId,
          mandatorySignIn: true,
        },
      });
    } else {
      throw new Error('Failed to load backend configuration.');
    }
  } catch (error) {
    console.error('Unable to bootstrap Amplify configuration', error);
    Amplify.configure({
      Auth: {
        region: process.env.REACT_APP_AWS_REGION || 'ap-southeast-2',
        userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
        userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '',
        mandatorySignIn: true,
      },
    });
  }

  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
}

bootstrap();
