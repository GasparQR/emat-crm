import React from 'react';

const ConsultaCard = ({ consulta }) => {
  return (
    <div>
      {/* Other sections */}

      {/* Importe section */}
      {/* Your Import code here */}

      {/* Observación */}
      {consulta.observacion && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 mb-2">
          <p className="text-xs text-slate-600 line-clamp-3">{consulta.observacion}</p>
        </div>
      )}

      {/* Footer section */}
      {/* Your Footer code here */}
    </div>
  );
};

export default ConsultaCard;