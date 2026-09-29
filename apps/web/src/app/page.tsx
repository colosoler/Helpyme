// Se renderiza en cada request: el estado de la API no se congela en el build.
export const dynamic = "force-dynamic";

async function getApiStatus(): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return "sin configurar (NEXT_PUBLIC_API_URL)";

  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    return res.ok ? "operativa" : `error ${res.status}`;
  } catch {
    return "no disponible";
  }
}

export default async function Home() {
  const apiStatus = await getApiStatus();

  return (
    <main style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1>Helpyme</h1>
      <p>Sabés cómo está tu negocio hoy, qué se viene y qué conviene hacer.</p>
      <p>
        Estado de la API: <strong>{apiStatus}</strong>
      </p>
    </main>
  );
}
