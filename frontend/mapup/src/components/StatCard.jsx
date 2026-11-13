
function StatCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <div className={`rounded-lg p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <h3 className="mt-4 text-3xl font-bold text-slate-800">
        {value}
      </h3>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default StatCard;
