import ApiCalls from '../Components/apicalls';
import config from '../config/config';
import { DashboardModel } from '../Components/devices/models/dashboardModel';

type SetAuth = Parameters<typeof ApiCalls>[3];
type SetUser = Parameters<typeof ApiCalls>[4];

// Dashboards the user can see (GET /getdashboards), also saved in localStorage
export async function loadDashboards(token: string, setAuth: SetAuth, setUser: SetUser): Promise<{ dashboards?: DashboardModel[], error?: string }> {
    const data = await ApiCalls({ token }, `${config.wsDatabaseUrl}/getdashboards/`, "get", setAuth, setUser);
    if (!data || data.error || !Array.isArray(data)) {
        return { error: data?.error?.message ?? "Dashboards not available" };
    }
    const dashboards: DashboardModel[] = data.map((d: { id: number, name: string }) =>
        ({ id: d.id, name: d.name, devices: [], streams: [] }));
    localStorage.setItem("dashboards", JSON.stringify(dashboards));
    return { dashboards };
}
