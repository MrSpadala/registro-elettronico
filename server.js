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
    host: 'localhost',
    user: 'my-app-user',
    password: 'my-app-password',
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
    if ((!req.session.user && allowed_without_session.includes(req.url)) || req.session.user)
        next();
    else
        res.redirect("/");
});
app.get('/', (req, res) => {
    if (req.session.user)
        res.redirect('/home_page');
    else
        res.status(200).sendFile((0, path_1.join)(__dirname, 'login.html'));
});
app.get('/home_page', (req, res) => {
    res.status(200).sendFile((0, path_1.join)(__dirname, 'home_page.html'));
});
app.get('/grades', (req, res) => {
    connection.query("SELECT * FROM grades", (err, response, fields) => res.status(200).send(JSON.stringify(response)));
});
app.post('/login', (req, res) => {
    const { name, password } = req.body;
    if (!name || !password)
        res.status(400).send("Missing username or password!");
    else if (req.session.user == undefined) {
        let query = `SELECT * FROM users WHERE username=\"${name}\" AND password=\"${password}\"`;
        console.log("Submitted query: " + query);
        connection.query(query, (err, response, fields) => {
            //console.log(fields)
            if (err) {
                console.log(err);
                res.status(400).send("DB error");
            }
            else {
                //console.log(response)
                if (response.length != 0) {
                    req.session.user = {
                        username: response[0].username,
                        admin: response[0].isadmin == 1
                    };
                    res.status(200).send();
                }
                else
                    res.status(400).send("Wrong credentials");
            }
        });
    }
});
app.delete('/logout', (req, res) => {
    req.session.destroy(() => {
        res.status(200).send();
    });
});
const port = 8080;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
