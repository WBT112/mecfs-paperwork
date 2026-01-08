/**
 * App shell for the offline-first paperwork UI.
 * Keeping this minimal avoids implicit data flows before storage is defined.
 */
export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>mecfs-paperwork</h1>
        <p className="app__subtitle">Offline-first paperwork workspace</p>
      </header>
      <main className="app__content">
        <section className="app__card">
          <h2>Workspace</h2>
          <p>
            This is a placeholder for upcoming record creation, review, and
            export tools.
          </p>
        </section>
      </main>
    </div>
  );
}
