import { useState, useEffect, useRef } from "react";
import { useMqtt } from '../Components/mqtt.tsx';

export function usePageActive() {
    const [isActive, setIsActive] = useState(!document.hidden);
    const lastTimeRef = useRef(Date.now());

    useEffect(() => {
        const handleVisibilityChange = () => {
            console.log("Document visibility changed");
            setIsActive(!document.hidden);
        };

        const handleFocus = () => {
            console.log("Window focused");
            setIsActive(true);
        };

        const handleBlur = () => {
            console.log("Window blurred");
            setIsActive(false);
        };

        const handlePageShow = () => {
            console.log("Page shown");
            setIsActive(true);
        };

        const handlePageHide = () => {
            console.log("Page hidden");
            setIsActive(false);
        };

        const handleResume = () => {
            console.log("Device resumed from suspension");
            setIsActive(true);
        };

        const handleFreeze = () => {
            console.log("Device frozen (suspended)");
            setIsActive(false);
        };

        // Heartbeat per rilevare resume da sospensione
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastTimeRef.current > 60000) {
                // salto sospetto (es: lockscreen + resume)
                console.log("Detected possible resume from suspension");
                useMqtt().mqttClient?.end(); // Forza riconnessione MQTT
                setIsActive(true);
            }
            lastTimeRef.current = now;
        }, 15000); // ogni 15s

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("pageshow", handlePageShow);
        window.addEventListener("pagehide", handlePageHide);
        document.addEventListener("resume", handleResume as EventListener);
        document.addEventListener("freeze", handleFreeze as EventListener);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("pageshow", handlePageShow);
            window.removeEventListener("pagehide", handlePageHide);
            document.removeEventListener("resume", handleResume as EventListener);
            document.removeEventListener("freeze", handleFreeze as EventListener);
            clearInterval(interval);
        };
    }, []);

    return isActive;
}
