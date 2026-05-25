import React, { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

function PaintDataLoader() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/data/paint-compatibility.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load paint data (${response.status})`);
        }
        return response.json();
      })
      .then((paintData) => {
        if (!cancelled) setData(paintData);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="app-shell">
        <main className="detail-panel">
          <div className="empty-state">
            <div className="empty-swatch" aria-hidden="true" />
            <h2>Could not load paint data</h2>
            <p>{error.message}. Regenerate the local data file before running the app.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-shell">
        <main className="detail-panel">
          <div className="empty-state">
            <div className="empty-swatch" aria-hidden="true" />
            <h2>Loading paint data</h2>
            <p>Preparing the mapper...</p>
          </div>
        </main>
      </div>
    );
  }

  return <App data={data} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PaintDataLoader />
  </StrictMode>,
);
