import Layout from '../components/Layout'

function SuperAdminDashboard() {
  return (
    <Layout>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Dashboard
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Bienvenido al panel de SuperAdmin
        </p>
      </div>
    </Layout>
  )
}

export default SuperAdminDashboard