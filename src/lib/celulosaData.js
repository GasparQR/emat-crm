// Celulosa CRM Data Store
// This module handles all data for the celulosa business

export const celulosaClientesData = [
  {
    id: "EMAT_001",
    empresa: "Fábrica de Tabiques - Causana",
    contacto: "Diego Casado",
    email: "diego@causana.com",
    telefono: "+54 9 3541 XXXXX",
    ubicacion: "Causana - Camino Carlos Paz",
    provincia: "Córdoba",
    estado: "Negociación",
    ultimoContacto: "2026-01-19",
    tipoCliente: "Construcción/Tabiquería",
    observaciones: "Obra en ejecución, tabiques de 100mm. Llamar en 20 días",
    responsable: "Andrés",
    superficie_m2: 125,
    valorEstimado: 4435
  },
  {
    id: "EMAT_002",
    empresa: "Construcciones Santina",
    contacto: "Marcela Velez",
    email: "marcela@santina.com",
    telefono: "+54 9 3541 XXXXX",
    ubicacion: "Santina Norte",
    provincia: "Córdoba",
    estado: "Ganada",
    ultimoContacto: "2026-01-15",
    tipoCliente: "Construcción",
    observaciones: "Cliente confirmado",
    responsable: "Andrés",
    superficie_m2: null,
    valorEstimado: 4436
  }
];

export const celulosaPresupuestosData = [
  {
    id: "PRES_001",
    mes: "ENERO",
    cliente: "Fábrica de Tabiques - Causana",
    contacto: "ANDRES",
    ubicacion: "Causana - Cno Carlos Paz",
    superficie_m2: 125,
    fibra_celulosa_kg: null,
    adhesivo_lts: null,
    tipoAplicacion: "Tabiques/Estructural",
    status: "Negociación",
    presupuesto: 4435,
    ultimoContacto: "2026-01-19",
    razonPerdida: null,
    acciones: "Tabiques de 100mm. contactado 19/01. Obra en ejecución, llamar en 20 días",
    lugar: "Interior",
    cotizo: "Sí",
    origen: "Contacto Directo"
  },
  {
    id: "PRES_002",
    mes: "ENERO",
    cliente: "Construcciones Santina",
    contacto: "ANDRES",
    ubicacion: "Santina norte",
    superficie_m2: null,
    fibra_celulosa_kg: null,
    adhesivo_lts: null,
    tipoAplicacion: "Aislamiento",
    status: "Ganada",
    presupuesto: 4436,
    ultimoContacto: "2026-01-15",
    razonPerdida: null,
    acciones: null,
    lugar: null,
    cotizo: null,
    origen: null
  }
];

const STORAGE_KEY_CLIENTES = 'emat_celulosa_clientes';
const STORAGE_KEY_PRESUPUESTOS = 'emat_celulosa_presupuestos';
const STORAGE_KEY_PIPELINE = 'emat_celulosa_pipeline';

// Initialize data if not exists
export const initializeData = () => {
  if (!localStorage.getItem(STORAGE_KEY_CLIENTES)) {
    localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(celulosaClientesData));
  }
  if (!localStorage.getItem(STORAGE_KEY_PRESUPUESTOS)) {
    localStorage.setItem(STORAGE_KEY_PRESUPUESTOS, JSON.stringify(celulosaPresupuestosData));
  }
  if (!localStorage.getItem(STORAGE_KEY_PIPELINE)) {
    localStorage.setItem(STORAGE_KEY_PIPELINE, JSON.stringify({
      porCotizar: [],
      cotizado: [],
      ganado: [],
      perdido: []
    }));
  }
};

// Get all clientes
export const getClientes = () => {
  const data = localStorage.getItem(STORAGE_KEY_CLIENTES);
  return data ? JSON.parse(data) : celulosaClientesData;
};

// Get all presupuestos
export const getPresupuestos = () => {
  const data = localStorage.getItem(STORAGE_KEY_PRESUPUESTOS);
  return data ? JSON.parse(data) : celulosaPresupuestosData;
};

// Add cliente
export const addCliente = (cliente) => {
  const clientes = getClientes();
  const newId = `EMAT_${String(clientes.length + 1).padStart(3, '0')}`;
  const newCliente = { id: newId, ...cliente, fecha_registro: new Date().toISOString() };
  clientes.push(newCliente);
  localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(clientes));
  return newCliente;
};

// Update cliente
export const updateCliente = (id, updates) => {
  const clientes = getClientes();
  const index = clientes.findIndex(c => c.id === id);
  if (index !== -1) {
    clientes[index] = { ...clientes[index], ...updates };
    localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(clientes));
    return clientes[index];
  }
  return null;
};

// Add presupuesto
export const addPresupuesto = (presupuesto) => {
  const presupuestos = getPresupuestos();
  const newId = `PRES_${String(presupuestos.length + 1).padStart(3, '0')}`;
  const newPresupuesto = { id: newId, ...presupuesto, fecha_creacion: new Date().toISOString() };
  presupuestos.push(newPresupuesto);
  localStorage.setItem(STORAGE_KEY_PRESUPUESTOS, JSON.stringify(presupuestos));
  return newPresupuesto;
};

// Update presupuesto
export const updatePresupuesto = (id, updates) => {
  const presupuestos = getPresupuestos();
  const index = presupuestos.findIndex(p => p.id === id);
  if (index !== -1) {
    presupuestos[index] = { ...presupuestos[index], ...updates };
    localStorage.setItem(STORAGE_KEY_PRESUPUESTOS, JSON.stringify(presupuestos));
    return presupuestos[index];
  }
  return null;
};

// Get pipeline data
export const getPipeline = () => {
  const data = localStorage.getItem(STORAGE_KEY_PIPELINE);
  const defaultPipeline = {
    porCotizar: [],
    cotizado: [],
    ganado: [],
    perdido: []
  };
  return data ? JSON.parse(data) : defaultPipeline;
};

// Update pipeline
export const updatePipeline = (pipeline) => {
  localStorage.setItem(STORAGE_KEY_PIPELINE, JSON.stringify(pipeline));
};
