'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function StatsChart({ data }: { data: { date: string; scans: number }[] }) {
  return (
    <div className="card">
      <div className="font-bold mb-6">Évolution des scans — 7 jours</div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="#A0AEC0" fontSize={11} tickFormatter={(d) => d.slice(5)} />
          <YAxis stroke="#A0AEC0" fontSize={11} />
          <Tooltip contentStyle={{ background: '#131A2A', border: '1px solid #232B3D', borderRadius: 12 }} />
          <Line type="monotone" dataKey="scans" stroke="#7C3AED" strokeWidth={3} dot={{ fill: '#EC4899', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
