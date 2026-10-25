import React from 'react';
import { DeviceLevel } from '../../utils/timeutil';

interface WidgetCardProps {
    title: string;
    level: DeviceLevel;          // danger: red header (offline / no data), warning: amber
    status: React.ReactNode;     // right side of the header (age, "Offline", "LIVE"...)
    wide?: boolean;              // takes two grid columns (sensor, camera)
    children: React.ReactNode;
}

// The common frame of every dashboard widget
const WidgetCard: React.FC<WidgetCardProps> = ({ title, level, status, wide, children }) => (
    <section className={`iotx-card${wide ? " iotx-wide" : ""}`} data-level={level} aria-label={title}>
        <header className="iotx-card-head">
            <span className="iotx-card-title" title={title}>{title}</span>
            <span className="iotx-card-status">{status}</span>
        </header>
        <div className="iotx-card-body">
            {children}
        </div>
    </section>
);

export default WidgetCard;
