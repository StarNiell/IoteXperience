import React, { useEffect, useRef, useState } from 'react';
import { useMqtt } from '../mqttContext';
import { PowerIcon, PushIcon } from './icons';

// How long to wait for the device to confirm a switch command
const CONFIRM_TIMEOUT = 5000;
// How long a message under the control stays visible
const FEEDBACK_TIME = 3000;
// How long the button stays lit after a press
const PULSE_TIME = 1200;

interface SwitchWidgetProps {
    title: string;
    deviceId: string;
    subscription: string;    // command topic
    value: number;           // 1 = on
    usable: boolean;         // false while offline or without recent data
    momentary: boolean;      // true: "button" (short pulse); false: "switch" (keeps its state)
}

// Switch: every press changes the state (on/off), confirmed by the device.
// Button: every press sends a short pulse (the device turns its output on for about 1 s).
const SwitchWidget: React.FC<SwitchWidgetProps> = ({ title, deviceId, subscription, value, usable, momentary }) => {
    const { publishMessage } = useMqtt();
    const on = Number(value) === 1;
    const [pending, setPending] = useState<number | null>(null);   // value requested, not yet confirmed
    const [fired, setFired] = useState(false);
    const [feedback, setFeedback] = useState<{ text: string, tone: string } | null>(null);
    const pendingRef = useRef<number | null>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const showFeedback = (text: string, tone: string) => {
        setFeedback({ text, tone });
        later(() => setFeedback(null), FEEDBACK_TIME);
    };

    // The device confirmed the requested state
    useEffect(() => {
        if (pending !== null && Number(value) === pending) {
            pendingRef.current = null;
            setPending(null);
        }
    }, [value, pending]);

    const send = (newValue: number) =>
        publishMessage(subscription, JSON.stringify({ device_id: deviceId, value: newValue }));

    const handleSwitch = () => {
        if (!usable || pending !== null) return;
        const target = on ? 0 : 1;
        send(target)
            .then(() => {
                pendingRef.current = target;
                setPending(target);
                later(() => {
                    if (pendingRef.current === target) {
                        pendingRef.current = null;
                        setPending(null);
                        showFeedback("No response from the device", "danger");
                    }
                }, CONFIRM_TIMEOUT);
            })
            .catch(() => showFeedback("Not sent: offline", "danger"));
    };

    const handleButton = () => {
        if (!usable) return;
        send(1)
            .then(() => {
                setFired(true);
                later(() => setFired(false), PULSE_TIME);
                showFeedback("Pulse sent", "on");
            })
            .catch(() => showFeedback("Not sent: offline", "danger"));
    };

    let foot = momentary ? "Button · Press" : `Switch · ${on ? "On" : "Off"}`;
    let tone = "";
    if (pending !== null) foot = pending === 1 ? "Turning on…" : "Turning off…";
    if (feedback) { foot = feedback.text; tone = feedback.tone; }

    const iconColor = momentary
        ? (fired ? "var(--iotx-on)" : "var(--iotx-accent)")
        : (on ? "var(--iotx-on)" : "var(--iotx-muted)");

    return (
        <>
            <div className="iotx-card-row iotx-card-control">
                {momentary ? <PushIcon color={iconColor} /> : <PowerIcon color={iconColor} />}
                {momentary ? (
                    <button type="button" className="iotx-push" data-fired={fired}
                        disabled={!usable} onClick={handleButton}
                        aria-label={`${title}: send a pulse`} />
                ) : (
                    <button type="button" className="iotx-toggle" role="switch" aria-checked={on}
                        data-pending={pending !== null} disabled={!usable} onClick={handleSwitch}
                        aria-label={`${title}: ${on ? "on" : "off"}`} />
                )}
            </div>
            <span className="iotx-card-foot" data-tone={tone} aria-live="polite">{foot}</span>
        </>
    );
};

export default SwitchWidget;
