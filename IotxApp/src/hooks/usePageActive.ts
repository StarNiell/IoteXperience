import { useState, useEffect } from "react";

export function usePageActive() {
    const [isActive, setIsActive] = useState(!document.hidden);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsActive(!document.hidden);
        };

        const handleFocus = () => {
            console.log("Window got focus");
            setIsActive(true);
        };

        const handleBlur = () => {
            console.log("Window lost focus");
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

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("freeze", handleFreeze);
        window.addEventListener("resume", handleResume);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("freeze", handleFreeze);
            window.removeEventListener("resume", handleResume);
        };
    }, []);

    return isActive;
}