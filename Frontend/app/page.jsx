const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

async function getBackendStatus() {
  try {
    const response = await fetch(new URL("/health", API_URL), {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      return "offline";
    }

    const payload = await response.json();
    return payload.status === "ok" ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export default async function Home() {
  const backendStatus = await getBackendStatus();
  const isOnline = backendStatus === "online";

  return (
    <main>
      <section aria-labelledby="page-title">
        <p className="eyebrow">Bandar Pasar</p>
        <h1 id="page-title">Frontend siap digunakan.</h1>
        <p className="summary">
          Next.js berjalan dengan App Router dan JavaScript JSX. Fitur produk
          ditambahkan setelah kebutuhannya jelas.
        </p>

        <div className="service-status">
          <span>Backend API</span>
          <strong className={isOnline ? "online" : "offline"}>
            <span className="status-dot" aria-hidden="true" />
            {isOnline ? "Terhubung" : "Tidak terhubung"}
          </strong>
        </div>
      </section>
    </main>
  );
}
