export default function SettingsPage() {
  const items = [
    { title: "Changer l'email", sub: 'Nécessite le mot de passe + nouvelle vérification' },
    { title: 'Changer le téléphone', sub: 'Nécessite le mot de passe actuel' },
    { title: 'Changer le mot de passe', sub: 'Min. 12 caractères, majuscule, chiffre' },
  ];
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold mb-8">Paramètres</h1>
      {items.map((s) => (
        <div key={s.title} className="card mb-4 flex justify-between items-center">
          <div><div className="font-semibold mb-1">{s.title}</div><div className="text-text-secondary text-sm">{s.sub}</div></div>
          <button className="btn-secondary !px-4 !py-2 !text-sm">Modifier</button>
        </div>
      ))}
      <div className="card border-red-500/30 bg-red-500/5">
        <div className="font-semibold text-red-400 mb-1">Désactiver mon compte</div>
        <div className="text-text-secondary text-sm mb-4">Ton QR sera désactivé. Les données ne sont jamais supprimées.</div>
        <button className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold">Désactiver</button>
      </div>
    </div>
  );
}
