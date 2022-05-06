"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mysql_1 = __importDefault(require("mysql"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = require("path");
var connection = mysql_1.default.createConnection({
    host: '192.168.1.100',
    user: 'root',
    password: 'cykablyat',
    database: 'registro'
});
connection.connect((err) => {
    if (err)
        throw err;
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
}));
app.use((req, res, next) => {
    let allowed_without_session = ["/", "/login"];
    if (allowed_without_session.includes(req.url) || req.session.user) {
        next();
    }
    else {
        res.redirect("/");
    }
});
app.get('/', (req, res) => {
    if (req.session.user)
        res.redirect('/home_page');
    else {
        res.status(200).sendFile((0, path_1.join)(__dirname, 'login.html'));
    }
});
app.get('/home_page', (req, res) => {
    res.status(200).sendFile((0, path_1.join)(__dirname, 'home_page.html'));
});
app.post('/login', (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        res.status(400).send("Missing username or password!");
    }
    else {
        if (req.session.user == undefined) {
            req.session.user = {
                name,
                surname: "prova",
                admin: false
            };
        }
        res.status(200).send();
    }
});
app.listen(8080, () => {
    console.log('diopo');
});
