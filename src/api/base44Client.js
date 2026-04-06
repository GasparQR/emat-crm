// Local data store using localStorage
// This replaces base44 SDK for Celulosa CRM

class LocalDataStore {
  constructor(entityName) {
    this.entityName = entityName;
  }

  getAll() {
    const key = `emat_${this.entityName}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  save(data) {
    const key = `emat_${this.entityName}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  async filter(query = {}, sortField = null, limit = 100) {
    let items = this.getAll();

    // Simple filter logic
    if (query.workspace_id) {
      items = items.filter(item => item.workspace_id === query.workspace_id);
    }
    if (query.user_id) {
      items = items.filter(item => item.user_id === query.user_id);
    }
    if (query.id) {
      items = items.filter(item => item.id === query.id);
    }

    // Sort if requested
    if (sortField) {
      const desc = sortField.startsWith('-');
      const field = desc ? sortField.substring(1) : sortField;
      items.sort((a, b) => {
        if (desc) return (b[field] ?? 0) - (a[field] ?? 0);
        return (a[field] ?? 0) - (b[field] ?? 0);
      });
    }

    // Apply limit
    return items.slice(0, limit);
  }

  async list(sortField = null, limit = 100) {
    return this.filter({}, sortField, limit);
  }

  async create(data) {
    const items = this.getAll();
    const id = `${this.entityName}_${Date.now()}`;
    const newItem = {
      id,
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };
    items.push(newItem);
    this.save(items);
    return newItem;
  }

  async update(id, data) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = {
        ...items[index],
        ...data,
        updated_date: new Date().toISOString()
      };
      this.save(items);
      return items[index];
    }
    return null;
  }

  async delete(id) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      const deleted = items[index];
      items.splice(index, 1);
      this.save(items);
      return deleted;
    }
    return null;
  }
}

const createEntityProxy = (entityName) => {
  const store = new LocalDataStore(entityName);
  return {
    filter: (query, sortField, limit) => store.filter(query, sortField, limit),
    list: (sortField, limit) => store.list(sortField, limit),
    create: (data) => store.create(data),
    update: (id, data) => store.update(id, data),
    delete: (id) => store.delete(id),
    getAll: () => store.getAll(),
  };
};

export const base44 = {
  // Auth
  auth: {
    me: async () => {
      return {
        id: 'user_1',
        name: 'Demo User',
        email: 'demo@emat.com'
      };
    }
  },

  // Entities
  entities: {
    Workspace: createEntityProxy('Workspace'),
    WorkspaceMember: createEntityProxy('WorkspaceMember'),
    Consulta: createEntityProxy('Consulta'),
    Contacto: createEntityProxy('Contacto'),
    Venta: createEntityProxy('Venta'),
    Proveedor: createEntityProxy('Proveedor'),
    PipelineStage: createEntityProxy('PipelineStage'),
    Postventa: createEntityProxy('Postventa'),
    HistorialEnvios: createEntityProxy('HistorialEnvios'),
    Cliente: createEntityProxy('Cliente'),
    Presupuesto: createEntityProxy('Presupuesto'),
  }
};
