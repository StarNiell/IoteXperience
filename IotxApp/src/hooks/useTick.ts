import { useState, useEffect } from "react";

// Re-renders the component every intervalMs (e.g. to re-check the age of the data
// even when no new message arrives). Returns the number of ticks so far.
export function useTick(intervalMs: number) {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick(n => n + 1), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return tick;
}
