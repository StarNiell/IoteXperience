"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const server_1 = require("./server");
const postgres_1 = require("./postgres");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('tiny'));
app.use(body_parser_1.default.json());
var db = new postgres_1.Postgres('192.168.1.107', 5432, 'postgres', 'Goldendrops2025', 'datawh');
const server = new server_1.Server(app, 3000, db);
if (server.listen()) {
    console.log('Server started');
}
//# sourceMappingURL=app.js.map