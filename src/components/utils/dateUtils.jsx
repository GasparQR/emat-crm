// Utilidades para manejo de fechas

export function getNextBusinessDay(startDate, businessDaysToAdd) {
  let currentDate = new Date(startDate);
  let daysCount = 0;

  while (daysCount < businessDaysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1); // Avanza un día
    const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

    // Si no es sábado (6) ni domingo (0), es un día hábil
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysCount++;
    }
  }

  // Formatear la fecha a YYYY-MM-DD
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const day = currentDate.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Próxima fecha de seguimiento según días hábiles configurados (p. ej. en Ajustes). */
export function getNextFollowUpDate(businessDaysToAdd) {
  const n = Number(businessDaysToAdd);
  const days = Number.isFinite(n) && n > 0 ? n : 3;
  return getNextBusinessDay(new Date(), days);
}
