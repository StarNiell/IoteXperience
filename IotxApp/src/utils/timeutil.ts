export class TimeUtil {
    static parseIsoDate(isoString: string): Date | null {
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? null : date;
    }
}