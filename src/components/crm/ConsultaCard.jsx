import React from 'react';

const ConsultaCard = ({ ubicacion, superficie, tipo, observacion }) => {
    return (
        <div className="consulta-card">
            <h2>Consulta</h2>
            <div className="ubicacion-section">
                <strong>Ubicación:</strong> {ubicacion}
            </div>
            {observacion && <div className="observacion-section">
                <strong>Observación:</strong> {observacion}
            </div>}
            <div className="superficie-tipo-section">
                <strong>Superficie:</strong> {superficie} <br />
                <strong>Tipo:</strong> {tipo}
            </div>
        </div>
    );
};


export default ConsultaCard;
