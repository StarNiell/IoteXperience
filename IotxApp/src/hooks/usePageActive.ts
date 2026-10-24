import { useState, useEffect } from "react";

// Page visibility as seen by the MQTT connection manager.
//
// - visible: false while the page is hidden (tab in background, phone screen off,
//   app in background). Focus/blur are NOT used: clicking another window or the
//   browser DevTools does not make the page inactive.
// - online: false as soon as the browser knows the device has no network (Wi-Fi off,
//   cable unplugged, no signal). It cannot know when the network is up but the server is
//   unreachable: that case is detected by the MQTT keepalive.
// - wakeup: a counter incremented every time the page may have been asleep or the
//   network may have come back (page shown again, resumed from freeze, restored from
//   the back/forward cache, browser back online). Effects that depend on it can check
//   the connection again even when "visible" did not change.
export function usePageActive() {
    const [visible, setVisible] = useState(!document.hidden);
    const [online, setOnline] = useState(navigator.onLine);
    const [wakeup, setWakeup] = useState(0);

    useEffect(() => {
        const wake = (reason: string) => {
            console.log("Page wakeup: " + reason);
            setWakeup(n => n + 1);
        };

        const handleVisibilityChange = () => {
            console.log("Page " + (document.hidden ? "hidden" : "visible"));
            setVisible(!document.hidden);
            if (!document.hidden) wake("visible");
        };
        // Page Lifecycle events are fired on document (Chrome, Android)
        const handleFreeze = () => console.log("Page frozen");
        const handleResume = () => wake("resumed from freeze");
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) wake("restored from back/forward cache");
        };
        const handleOnline = () => {
            setOnline(true);
            wake("browser back online");
        };
        const handleOffline = () => {
            console.log("Browser offline (no network)");
            setOnline(false);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("freeze", handleFreeze);
        document.addEventListener("resume", handleResume);
        window.addEventListener("pageshow", handlePageShow);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("freeze", handleFreeze);
            document.removeEventListener("resume", handleResume);
            window.removeEventListener("pageshow", handlePageShow);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return { visible, online, wakeup };
}
