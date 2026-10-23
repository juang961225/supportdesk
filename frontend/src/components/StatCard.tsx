interface StatCardProps {
  label: string
  value: number
  color: string // clases de color del número (Tailwind)
}

// Tarjeta de contador para los dashboards
function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl md:text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

export default StatCard
