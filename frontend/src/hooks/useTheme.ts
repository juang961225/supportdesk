import { useState, useEffect } from 'react'

export const useTheme = () => {
  // Lee el tema guardado en localStorage o usa el del sistema
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    // Si no hay preferencia guardada, usa la del sistema operativo
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Cuando isDark cambia, agrega o quita la clase 'dark' del html
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark]) // ← se ejecuta cada vez que isDark cambia

  const toggleTheme = () => setIsDark(!isDark)

  return { isDark, toggleTheme }
}
