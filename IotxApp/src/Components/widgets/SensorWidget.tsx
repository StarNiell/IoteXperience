import React from 'react';

interface SensorWidgetProps {
    value: number;          // main value, offset already applied
    unit: string;
    value2: number | null;  // secondary value (e.g. humidity)
    unit2: string;
    min: number;
    max: number;
    title: string;
}

const ARC = "M 20 90 A 70 70 0 0 1 160 90";
const ARC_LENGTH = Math.PI * 70;

// Colour of the value, by fraction of the maximum (same thresholds as before)
function valueColor(value: number, max: number): string {
    if (value < max * 0.284) return "var(--iotx-cold)";
    if (value < max * 0.417) return "var(--iotx-ok)";
    if (value < max * 0.567) return "var(--iotx-warm)";
    return "var(--iotx-hot)";
}

const SensorWidget: React.FC<SensorWidgetProps> = ({ value, unit, value2, unit2, min, max, title }) => {
    const valid = Number.isFinite(value);
    const range = max > min ? max - min : 100;
    const fraction = valid ? Math.min(1, Math.max(0, (value - min) / range)) : 0;
    const text = valid ? `${value.toFixed(1)}${unit}` : "—";
    const secondary = value2 !== null && value2 !== undefined && Number.isFinite(Number(value2))
        ? `${Number.isInteger(Number(value2)) ? Number(value2) : Number(value2).toFixed(1)}${unit2 ? " " + unit2 : ""}` : "";

    return (
        <div className="iotx-sensor iotx-card-control">
            <svg viewBox="0 0 180 100" role="img" aria-label={`${title}: ${text}`}>
                <path d={ARC} fill="none" stroke="var(--iotx-surface-2)" strokeWidth="14" strokeLinecap="round" />
                {valid && (
                    <path d={ARC} fill="none" stroke={valueColor(value, max)} strokeWidth="14" strokeLinecap="round"
                        strokeDasharray={ARC_LENGTH} strokeDashoffset={ARC_LENGTH * (1 - fraction)} />
                )}
            </svg>
            <div className="iotx-sensor-values">
                <span className="iotx-sensor-value">{text}</span>
                {secondary && <span className="iotx-card-foot">{secondary}</span>}
            </div>
        </div>
    );
};

export default SensorWidget;
