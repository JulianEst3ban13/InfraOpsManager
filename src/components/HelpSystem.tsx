import React from 'react';

interface HelpTip {
    id: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

export const HelpSystem: React.FC<{ tipId: string }> = ({ tipId }) => {
    const tips: Record<string, HelpTip> = {
        'new-maintenance': {
            id: 'new-maintenance',
            title: 'Nuevo Mantenimiento',
            content: 'Complete los campos para programar un nuevo mantenimiento.',
            position: 'right'
        },
        'connection-test': {
            id: 'connection-test',
            title: 'Prueba de Conexión',
            content: 'Verifica la conexión antes de guardar.',
            position: 'bottom'
        }
    };

    const tip = tips[tipId];
    if (!tip) return null;

    return (
        <div className="help-tooltip" data-position={tip.position}>
            <h4>{tip.title}</h4>
            <p>{tip.content}</p>
        </div>
    );
};
