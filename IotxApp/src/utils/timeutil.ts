export class TimeUtil {
    static parseIsoDate(isoString: string): Date | null {
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? null : date;
    }

    // True if the value is older than maxAgeMs, or its timestamp is not valid
    static isExpired(timestamp: string, maxAgeMs: number): boolean {
        const valueTime = TimeUtil.parseIsoDate(timestamp);
        return valueTime ? (Date.now() - valueTime.getTime()) > maxAgeMs : true;
    }

    // Header colour of a device widget:
    // red when the MQTT connection is down or the value is too old,
    // yellow when the device sent no timestamp, gray otherwise.
    static deviceHeaderClass(timestamp: string, maxAgeMs: number, connected: boolean): string {
        if (!connected) return "bg-danger";
        if (timestamp === "0000-00-00T00:00:00Z") return "bg-warning";
        if (TimeUtil.isExpired(timestamp, maxAgeMs)) return "bg-danger";
        return "bg-lightgray";
    }
}
