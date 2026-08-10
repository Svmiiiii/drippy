export function LegalPage({ title, highlight, disclaimer, sections }: {
  title: string;
  highlight: string;
  disclaimer?: string;
  sections: { h: string; p: string }[];
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-text-secondary leading-relaxed">
      <h1 className="font-heading text-4xl mb-8 text-white">{title} <span className="gradient-text">{highlight}</span></h1>
      {disclaimer && <p className="mb-6 text-sm bg-accent/10 border border-accent/30 rounded-2xl p-4 text-accent">⚠️ {disclaimer}</p>}
      {sections.map((s, i) => (
        <div key={i}>
          <h2 className="text-white font-bold text-lg mt-8 mb-2">{s.h}</h2>
          <p>{s.p}</p>
        </div>
      ))}
    </div>
  );
}
