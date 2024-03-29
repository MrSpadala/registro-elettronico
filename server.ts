/**
 * Questo è il codice utilizzato come server del registro elettronico vulnerabile a XSS e SQL injections visto durante la lezione.
 * È scritto in javascript e ha bisogno di nodejs per essere eseguito. 
 * Per salvarsi i dati si appoggia ad un database MySQL che gira su localhost.
 * 
 * Per connettersi, una volta avviato il database ed il server, basta aprire un browser e scrivere nella barra superiore http://localhost:8080/
 */

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
    multipleStatements: true
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
    cookie: {
        httpOnly: false,
    }
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


/**
 * DISCLAIMER: Queste funzioni sono una versione estremamente semplificata e poco efficiente dei veri algoritmi per sanificare 
 * l'input di un utente da possibili SQL injection o XSS. Non usate queste funzioni per programmi o servizi che volete esporre
 * su internet perché offrono una protezione di base. Usate sempre librerie testate e considerate sicure da milioni di programmatori.
 * 
 * In breve, non reinventate la ruota, soprattutto quando si parla di sicurezza.
 * 
 * Un paio di link utili:
 * https://docs.microsoft.com/en-us/sql/relational-databases/security/sql-injection?view=sql-server-ver16
 * https://github.com/leizongmin/js-xss
 */
const CLEAN_INPUTS = false
function sanitizeXSS(s: string) {
    s = s.split("&").join('&amp;')
    s = s.split('"').join('&quot;')
    s = s.split("'").join('&#39;')
    s = s.split("<").join('&lt;')
    s = s.split(">").join('&gt;')
    s = s.split("/").join('&#x2F;')
    return s
}

function sanitizeSQL(s: string) {
    s = s.split('"').join('\\\"')
    s = s.split("'").join("\\\'")
    return s
}

app.use((req, res, next) => {
    let allowed_without_session = ["/", "/login", "/tests/test_js", "/tests/test_js_injection", "/tests/hello_world"]
    if ((!req.session.user && allowed_without_session.includes(req.url)) || req.session.user) next()
    else res.redirect("/")
})

app.get('/', (req, res) => {
    if (req.session.user) res.redirect('/home_page')
    else res.status(200).sendFile(join(__dirname, 'login.html'))
})

app.get('/tests/test_js', (req, res) => {
    res.status(200).sendFile(join(__dirname, 'html_tests/test_js.html'))
})

app.get('/tests/test_js_injection', (req, res) => {
    res.status(200).sendFile(join(__dirname, 'html_tests/test_js_injection.html'))
})

app.get('/tests/hello_world', (req, res) => {
    res.status(200).sendFile(join(__dirname, 'html_tests/test.html'))
})

app.get('/home_page', (req, res) => {
    res.status(200).sendFile(join(__dirname, 'home_page.html'))
})

app.get('/home_page_infos', (req, res) => {
    let query = req.session.user?.admin ? (
        "SELECT * FROM grades;"
    ) : (`SELECT * FROM grades WHERE username=\"${req.session.user?.username}\"`);
    console.log("Submitted query: " + query)
    connection.query(query, (err, response_grades, fields) => {
        if(err) throw err
        else {
            connection.query("SELECT * FROM notes", (err, response_notes, fields) => {
                if(err) throw err
                else {
                    let body = {
                        grades: response_grades,
                        user: req.session.user,
                        notes: response_notes
                    }
                    res.setHeader("Content-Type", "application/json; charset=utf-8").status(200).send(JSON.stringify(body))
                }
            })
        }
    })
})


app.post('/login', (req, res) => {
    let { name, password } = req.body
    if (!name || !password) res.status(400).send("Missing username or password!")
    else if (req.session.user == undefined) {
        if(CLEAN_INPUTS) {
            name = sanitizeSQL(name)
            password = sanitizeSQL(password)
        }
        let query = `SELECT * FROM users WHERE username=\"${name}\" AND password=\"${password}\";`
        console.log("Submitted query: " + query)
        connection.query(query, (err, response, fields) => {
            //console.log(fields)
            if (err) {
                console.log(err)
                res.status(400).send("DB error")
            }
            else {
                if(response.length > 0 && typeof response[0].length == "number") {
                    response = response[0]
                }
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
        let {note} = req.body
        if(CLEAN_INPUTS) {
            note = sanitizeXSS(note)
        }
        let query = `INSERT INTO notes (text) VALUES ("${note}");`
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