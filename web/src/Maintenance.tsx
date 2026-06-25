import "./App.css";

export function Maintenance() {
  return (
    <div className="app maintenance">
      <header className="app-header">
        <div className="title-block">
          <h1>Scholardle</h1>
          <p className="tagline">Guess the hidden behavioral scientist</p>
        </div>
      </header>

      <div className="maintenance-box">
        <h2>Back soon &mdash; under construction</h2>
        <p>
          Scholardle is getting an upgrade: a fresh roster of behavioral
          scientists, a denser collaboration network, and new clues.
        </p>
        <p className="maintenance-note">
          Check back shortly. Thanks for your patience!
        </p>
      </div>

      <footer className="app-footer">
        <p>
          Data from <a href="https://openalex.org">OpenAlex</a>,{" "}
          <a href="https://www.semanticscholar.org">Semantic Scholar</a>, and{" "}
          <a href="https://wikipedia.org">Wikipedia</a>.
        </p>
      </footer>
    </div>
  );
}
