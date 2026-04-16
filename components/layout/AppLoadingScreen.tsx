'use client';

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
    <div className="loading-card">
      <div className="loading-spinner" aria-hidden="true" />
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h1 className="h4 fw-semibold mb-2">{title}</h1>
      <p className="page-muted mb-0">{copy}</p>
    </div>
  </main>
);

export default AppLoadingScreen;
