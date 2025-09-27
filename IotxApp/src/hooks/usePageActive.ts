import { useState, useEffect } from "react";

export function usePageActive() {
    const [isActive, setIsActive] = useState(!document.hidden);

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

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    return isActive;
}