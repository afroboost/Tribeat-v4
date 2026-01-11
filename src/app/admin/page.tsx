/**
 * PAGE ACCUEIL — TEST FINAL LOGOUT
 * Cette page est CELLE que tu vois sur l’URL fournie
 */

export default function HomePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Accueil</h1>

      {/* ✅ LOGOUT OFFICIEL NEXTAUTH */}
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          style={{
            marginTop: 20,
            padding: '10px 16px',
            background: 'red',
            color: 'white',
            borderRadius: 6,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          SE DÉCONNECTER
        </button>
      </form>
    </main>
  );
}
