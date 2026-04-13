import Layout from '../components/Layout'

function UsuarioDashboard() {
  return (
    <Layout>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Mis Tickets
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Tickets que has creado
        </p>
      </div>
    </Layout>
  )
}

export default UsuarioDashboard