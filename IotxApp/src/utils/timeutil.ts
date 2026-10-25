export type DeviceLevel = "ok" | "warning" | "danger";

export interface DeviceState {
    level: DeviceLevel;     // ok: gray header; warning: amber; danger: red
    text: string;           // shown on the right of the widget header
    usable: boolean;        // false: commands are disabled
}

// Timestamp sent by devices that do not know the time
export const NO_TIMESTAMP = "0000-00-00T00:00:00Z";

export class TimeUtil {
    static parseIsoDate(isoString: string | null | undefined): Date | null {
        if (!isoString) return null;
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? null : date;
    }

    // True if the value is older than maxAgeMs, or its timestamp is not valid
    static isExpired(timestamp: string, maxAgeMs: number): boolean {
        const valueTime = TimeUtil.parseIsoDate(timestamp);
        return valueTime ? (Date.now() - valueTime.getTime()) > maxAgeMs : true;
    }

    // Age of a value in a short form: "now", "45 s", "3 min", "2 h", "4 d"
    static formatAge(timestamp: string | null | undefined): string {
        const valueTime = TimeUtil.parseIsoDate(timestamp);
        if (!valueTime) return "never";
        const seconds = Math.max(0, Math.round((Date.now() - valueTime.getTime()) / 1000));
        if (seconds < 20) return "now";
        if (seconds < 60) return `${seconds} s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 48) return `${hours} h`;
        return `${Math.floor(hours / 24)} d`;
    }

    // State of a device widget:
    // danger when the MQTT connection is down or the value is older than maxAgeMs,
    // warning when the device sent no timestamp, ok otherwise.
    static deviceState(timestamp: string, maxAgeMs: number, connected: boolean): DeviceState {
        if (!connected) return { level: "danger", text: "Offline", usable: false };
        if (timestamp === NO_TIMESTAMP) return { level: "warning", text: "No timestamp", usable: true };
        if (TimeUtil.isExpired(timestamp, maxAgeMs)) {
            const age = TimeUtil.formatAge(timestamp);
            return { level: "danger", text: age === "never" ? "No data" : `No data · ${age}`, usable: false };
        }
        return { level: "ok", text: TimeUtil.formatAge(timestamp), usable: true };
    }
}
