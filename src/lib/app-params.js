// Simple app params for EMAT CRM

const getAppParams = () => {
  return {
    appId: 'emat-celulosa-crm',
    token: localStorage.getItem('emat_token') || null,
    fromUrl: window?.location.href || null,
    functionsVersion: '1.0.0',
    appBaseUrl: import.meta.env.VITE_APP_BASE_URL || window?.location.origin || 'http://localhost:5173',
  };
};

export const appParams = {
  ...getAppParams()
};
