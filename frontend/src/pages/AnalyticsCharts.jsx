import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty, SectionCard } from '../components/ui';

const CHART_COLORS = [
  'var(--cc-primary)', 'var(--cc-info)', 'var(--cc-accent)', 'var(--cc-warning)',
  'var(--cc-success)', 'var(--cc-danger)', 'var(--cc-info)', 'var(--cc-primary-2)',
];
const chartTip = {
  contentStyle: { background: 'var(--cc-surface)', border: '1px solid var(--cc-border)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--cc-text)' },
  itemStyle: { color: 'var(--cc-text)' },
};
const tick = { fill: 'currentColor', fontSize: 11 };

function bars(rows, color, vertical) {
  if (!rows.length) return <Empty title="No data" hint="Nothing to chart yet." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * (vertical ? 34 : 28))}>
      <BarChart data={rows} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--cc-border)" />
        {vertical
          ? <><XAxis type="number" tick={tick} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={110} tick={tick} axisLine={false} tickLine={false} /></>
          : <><XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval={0} angle={-18} dy={8} height={52} /><YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} /></>}
        <Tooltip {...chartTip} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Real placement analytics charts (lazy-loaded so recharts stays out of the main bundle). */
export default function AnalyticsCharts({ data }) {
  const d = data || {};
  const byBranch = (d.byBranch || []).map((x) => ({ name: x._id || '—', value: x.n }));
  const byStatus = (d.byStatus || []).map((x) => ({ name: x._id || '—', value: x.n }));
  const byCompany = (d.byCompany || []).map((x) => ({ name: x.company || '—', value: x.n }));
  const byJobType = (d.byJobType || []).map((x) => ({ name: x._id || '—', value: x.n }));
  const byCourse = (d.byCourse || []).map((x) => ({ name: x.course || '—', value: x.n }));
  const bySkill = (d.bySkill || []).map((x) => ({ name: x.skill || '—', value: x.n }));
  const byDrive = (d.byDrive || []).map((x) => ({ name: x.drive || '—', value: x.n }));
  const funnel = (d.funnel || []).map((x) => ({ name: x.name, value: x.value }));
  return (
    <div className="cc-grid-2">
      <SectionCard title="Placement funnel">{bars(funnel, 'var(--cc-primary)')}</SectionCard>
      <SectionCard title="Drive-wise performance">{bars(byDrive, 'var(--cc-info)')}</SectionCard>
      <SectionCard title="Course-wise placements">{bars(byCourse, 'var(--cc-warning)')}</SectionCard>
      <SectionCard title="Jobs by type">{bars(byJobType, 'var(--cc-accent)')}</SectionCard>
      <SectionCard title="Students by branch">{bars(byBranch, 'var(--cc-primary)')}</SectionCard>
      <SectionCard title="Company-wise applications">{bars(byCompany, 'var(--cc-info)')}</SectionCard>
      <SectionCard title="Most demanded skills">{bars(bySkill, 'var(--cc-success)')}</SectionCard>
      <SectionCard title="Applications by status">
        {byStatus.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={88} label={({ name, value }) => `${name}: ${value}`}>
              {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie><Tooltip {...chartTip} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart>
          </ResponsiveContainer>
        ) : <Empty title="No data" hint="Nothing to chart yet." />}
      </SectionCard>
    </div>
  );
}
