/**
 * Compute the next sequential budget number (nroppto) from the list of consultas.
 * @param {Array} consultas - list of consulta objects
 * @returns {number} next nroppto
 */
export function getNextNroPpto(consultas) {
  const maxNro = consultas.reduce((max, c) => {
    const n = parseInt(c.nroppto, 10);
    return !isNaN(n) && n > max ? n : max;
  }, 0);
  return maxNro + 1;
}

/**
 * Return the pipeline_stage name of the first stage (orden === 0), typically "NUEVO LEAD".
 * @param {Array} etapas - list of PipelineStage objects
 * @returns {string|null}
 */
export function getNuevoLeadStageName(etapas) {
  return etapas.find(e => e.orden === 0)?.pipeline_stage || null;
}
