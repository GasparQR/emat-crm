// Updated Consultas.jsx with normalized filter for etapa field

function filterConsultas(consultas, etapa) {
  // Normalize input
  const normalizedEtapa = etapa.trim().toLowerCase();
  
  return consultas.filter(consulta => {
    return consulta.etapa.trim().toLowerCase() === normalizedEtapa;
  });
}

export default filterConsultas;