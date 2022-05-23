import express from 'express';
import mysql from 'mysql';
import session from 'express-session'
import { join } from 'path'

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'my-app-user',
    password: 'my-app-password',
    database: 'registro',
    charset: 'utf8_general_ci',
});

connection.connect((err) => {
    if (err) throw err
});

const app = express();
app.use(express.json())
app.use(session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
}))

declare module 'express-session' {
    interface SessionData {
        user: {
            admin: boolean,
            username: string,
            name: string,
            surname: string,
        };
    }
}

app.use((req, res, next) => {
    let allowed_without_session = ["/", "/login"]
    if ((!req.session.user && allowed_without_session.includes(req.url)) || req.session.user) next()
    else res.redirect("/")
})

app.get('/', (req, res) => {
    if (req.session.user) res.redirect('/home_page')
    else res.status(200).sendFile(join(__dirname, 'login.html'))
})

app.get('/home_page', (req, res) => {
    res.status(200).sendFile(join(__dirname, 'home_page.html'))
})

app.get('/home_page_infos', (req, res) => {
    connection.query(`SELECT * FROM grades WHERE username=\"${req.session.user?.username}\"`, (err, response_grades, fields) => {
        connection.query("SELECT * FROM notes", (err, response_notes, fields) => {
            //connection.query(`SELECT (name, surname) FROM users WHERE username=\"${req.session.user?.username}\"`, (err, response_names, fields) => {
            let body = {
                grades: response_grades,
                user: req.session.user,
                notes: response_notes
            }
            console.log( JSON.stringify(body))
            res.setHeader("Content-Type", "application/json; charset=utf-8").status(200).send(JSON.stringify(body))
            //})
        })
    })
})


app.post('/login', (req, res) => {
    const { name, password } = req.body
    if (!name || !password) res.status(400).send("Missing username or password!")
    else if (req.session.user == undefined) {
        let query = `SELECT * FROM users WHERE username=\"${name}\" AND password=\"${password}\"`
        console.log("Submitted query: " + query)
        connection.query(query, (err, response, fields) => {
            //console.log(fields)
            if (err) {
                console.log(err)
                res.status(400).send("DB error")
            }
            else {
                //console.log(response)
                if (response.length != 0) {
                    req.session.user = {
                        username: response[0].username,
                        admin: response[0].isadmin == 1,
                        name: response[0].name,
                        surname: response[0].surname,
                    }
                    res.status(200).send()
                }
                else res.status(400).send("Wrong credentials")
            }
        })
    }
})

app.post('/createGrade', (req, res) => {
    if(req.session.user?.admin) {
        let { username, subject, grade } = req.body
        let query = `INSERT INTO grades (username, subject, grade) VALUES ("${username}", "${subject}", ${grade});`
        console.log("Submitted query: " + query)
        connection.query(query, (err, response, fields) => {
            if(err) {
                console.log(err)
                res.status(400).send("DB error")
            }
            else {
                //console.log(response)
                res.status(200).send()
            }
        })
    }
    else {
        res.status(403).send('Error: you are not an admin')
    }
})

app.delete('/deleteGrade/(:gradeid)', (req, res) => {
    if(req.session.user?.admin) {
        let query = `DELETE FROM grades WHERE gradeid = ${req.params.gradeid}`
        console.log("Submitted query: " + query)
        connection.query(query, (err, response, fields) => {
            if(err) {
                console.log(err)
                res.status(400).send("DB error")
            }
            else {
                //console.log(response)
                if(response.affectedRows == 1) {
                    res.status(200).send()
                }
                else {
                    res.status(400).send(`Error: gradeid ${req.params.gradeid} not found`)
                }
            }
        })
    }
    else {
        res.status(403).send('Error: you are not an admin')
    }
})

app.delete('/logout', (req, res) => {
    req.session.destroy(() => {
        res.status(200).send()
    })
})

app.post('/createNote', (req, res) => {
    if(req.session.user?.admin) {
        let query = `INSERT INTO notes (text) VALUES ("${req.body.note}");`
        console.log("Submitted query: " + query)
        connection.query(query, (err, response, fields) => {
            if(err) {
                console.log(err)
                res.status(400).send("DB error")
            }
            else {
                //console.log(response)
                res.status(200).send()
            }
        })
    }
    else {
        res.status(403).send('Error: you are not an admin')
    }
})

const port = 8080
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})