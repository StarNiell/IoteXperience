import { useState, useEffect, useRef } from "react";

export function usePageActive() {
    const [isActive, setIsActive] = useState(!document.hidden);
    const lastTimeRef = useRef(Date.now());

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsActive(!document.hidden);
        };

        const handleFocus = () => {
            setIsActive(true);
        };

        const handleBlur = () => {
            setIsActive(false);
        };

        const handlePageShow = () => {
            setIsActive(true);
        };

        const handlePageHide = () => {
            setIsActive(false);
        };

        const handleResume = () => {
            setIsActive(true);
        };

        const handleFreeze = () => {
            setIsActive(false);
        };

        // Heartbeat per rilevare resume da sospensione
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastTimeRef.current > 60000) {
                // salto sospetto (es: lockscreen + resume)
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
