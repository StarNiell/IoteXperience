export class UserDashboardModel {
    id: number = 0;
    userId: number = 0;
    userName: string = "";
    dashboardId: number = 0;
    hasAccess: boolean = false;
    isDefault: boolean = false;

    constructor(obj: {
        id: number
        userId: number;
        userName: string;
        dashboardId: number;
        hasAccess: boolean;
        isDefault: boolean;
    }) {
        this.id = obj.id;
        this.userId = obj.userId;
        this.userName = obj.userName;
        this.dashboardId = obj.dashboardId;
        this.hasAccess = obj.hasAccess;
        this.isDefault = obj.isDefault;
    }
}
