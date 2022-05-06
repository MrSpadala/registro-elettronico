import express from 'express';
import mysql from 'mysql';
import session from 'express-session'
import { join } from 'path'

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'my-app-user',
  password : 'my-app-password',
  database : 'registro'
});
 
connection.connect((err) => {
    if(err) throw err
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
        };
    }
}

app.use((req,res,next) => {
    let allowed_without_session = ["/", "/login"]
    if(allowed_without_session.includes(req.url) || req.session.user) {
        next()
    }
    else {
        res.redirect("/")
    }
})

app.get('/', (req, res) => {
    if(req.session.user) res.redirect('/home_page')
    else {
        res.status(200).sendFile(join(__dirname, 'login.html'))
    }
})

app.get('/home_page', (req, res) => {
    res.status(200).sendFile(join(__dirname, 'home_page.html'))
})

app.get('/grades', (req,res) => {
    connection.query("SELECT * FROM grades", (err, response, fields) => {
        //console.log(err)
        console.log(response)
        //console.log(fields)
        res.status(200).send(JSON.stringify(response))
    })
})


app.post('/login', (req, res) => {
    const {name, password} = req.body
    if(!name || !password) {
        res.status(400).send("Missing username or password!")
    }
    else {
        if (req.session.user == undefined) {
            let query = `SELECT * FROM users WHERE username=\"${name}\" AND password=\"${password}\"`
            console.log("Submitted query: " + query)
            connection.query(query, (err, response, fields) => {
                if(err) {
                    console.log(err)
                    res.status(400).send("DB error")
                }
                else {
                    console.log(response)
                    if(response.length > 0) {
                        req.session.user = {
                            username: response[0].username,
                            admin: response[0].isadmin == 1
                        }
                        res.status(200).send()
                    }
                    else res.status(400).send("Wrong credentials")
                }
                //console.log(err)
                //console.log(response)
                //console.log(fields)
            })
        }
    }
})

app.delete('/logout', (req,res) => {
    req.session.destroy(() => {
        res.status(200).send()
    })
})

app.listen(8080, () => {
    console.log('diopo')
})
