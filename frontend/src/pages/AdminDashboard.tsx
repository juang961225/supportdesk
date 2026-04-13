import Layout from '../components/Layout'

function AdminDashboard() {
  return (
    <Layout>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Dashboard
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Bienvenido al panel de Admin
        </p>
      </div>
    </Layout>
  )
}

export default AdminDashboard