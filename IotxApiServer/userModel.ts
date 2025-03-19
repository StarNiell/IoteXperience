export class UserModel {
    id: number = 0;
    username: string = "";
    password: string = "";
    email: string = "";
    admin: boolean = false;

    constructor(obj: {
        id: number, username: string; password: string, email: string, admin: boolean
    }) {
        this.id = obj.id;
        this.username = obj.username;
        this.password = obj.password;
        this.email = obj.email;
        this.admin = obj.admin;
    }
}
