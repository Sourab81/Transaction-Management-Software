'use client';

import LoadingState from '../ui/state/LoadingState';

interface AppLoadingScreenProps {
  eyebrow?: string;
  title?: string;
  copy?: string;
}

const AppLoadingScreen = ({
  eyebrow = 'Preparing Workspace',
  title = 'Loading eNest',
  copy = 'Restoring your dashboard session and workspace data.',
}: AppLoadingScreenProps) => (
  <main className="loading-screen">
    <LoadingState
      eyebrow={eyebrow}
      title={title}
      description={copy}
      className="loading-card"
    />
  </main>
);

export default AppLoadingScreen;
