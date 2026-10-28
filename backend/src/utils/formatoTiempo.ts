// Tiempo laboral legible en días de jornada + lo que sobra del último día (funciones puras).
// Con jornada de 8 h: 21 h → "2 días y 5 h". Menos de una jornada: "5 h 20 min". Así "21 h" no se lee como "mañana".

const horasYMinutos = (minutos: number): string => {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

export const formatTiempoLaboral = (minutos: number, minutosJornada: number): string => {
  if (minutosJornada <= 0 || minutos < minutosJornada) return horasYMinutos(minutos)
  const dias = Math.floor(minutos / minutosJornada)
  const resto = minutos % minutosJornada
  const textoDias = `${dias} ${dias === 1 ? 'día' : 'días'}`
  return resto ? `${textoDias} y ${horasYMinutos(resto)}` : textoDias
}
