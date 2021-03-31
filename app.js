const express = require('express')
const app = express()

const port = process.env.PORT || 3000

//---

const session = require('express-session')
app.use(session({
    secret: 'Secreto',
    resave: false,
    saveUninitialized: false,
}))

const bcrypt = require('bcrypt')

const util = require('util')

const mysql = require('mysql')
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'pruebas'
})
 
connection.connect();

connection.query = util.promisify(connection.query);

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

passport.use('local.signin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (username, password, done) => {
    const rows = await connection.query(`SELECT * FROM users WHERE email = '${username}'`)
    if (rows.length > 0) {
        const user = rows[0]
        const validPass= await bcrypt.compare(password, user.password)
        if (validPass) {
            return done(null, user)
        } else {
            return done(null, false, {message: 'email y contraseña incorrecto'})
        }
    } else {
        return done(null, false, {message: 'email y contraseña incorrecto'})
    }
}))

passport.use('local.signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (username, password, done) => {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = { email:username, password:hash }

    const result = await connection.query('INSERT INTO users SET ?', user)
    user.id = result.insertId
    return done(null, user)
}))

passport.serializeUser((user, done) => {
    return done(null, user.id)
})

passport.deserializeUser( async (id, done) => {
    const rows = await connection.query(`SELECT * FROM users WHERE id = ${id}`)
    return done(null, rows[0])
})

app.use(passport.initialize())
app.use(passport.session())

// ---

app.use(express.urlencoded({extended: false}))

app.set('view engine', 'ejs')

app.get('/', (req, res, next) => {
    if(req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}, (req, res) => {
    res.render('index',)
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', passport.authenticate('local.signup', {
    successRedirect: '/',
    failureRedirect: '/register'
}))

app.get('/login', (req, res, next) => {
    if(req.isAuthenticated()) { 
        res.redirect('/')
    }

    return next()
}, (req, res) => {
    res.render('login')
})

app.post('/login', passport.authenticate('local.signin', {
    successRedirect: '/',
    failureRedirect: '/login'
}))

app.get('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})
