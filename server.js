/*create a http server using express*/

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('mssql')

const webconfig = {
    user: "sa",
    password: "123456",
    database: "survey",
    server: 'DESKTOP-5DT7LH0',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(cors())
app.use(bodyParser.json());
/*run this server in 8080*/

app.get('/', cors(), async (req, res) => {
    res.send('working!')
});

let questionsData = [];

app.post("/question_data", cors(), async (req, res) => {
    questionsData = req.body;
    console.log(JSON.stringify(questionsData));
});

app.get('/question_data', cors(), async (req, res) => {
    res.send(JSON.stringify(questionsData));
});

let adminData = "";

app.post('/add_admin', cors(), async (req, res) => {

        adminData = (req.body);
        let un = (adminData.username)
        let pw = (adminData.password)
        let mail = (adminData.email)

        /*un ve pw değerlerini veritabanında TBLUsers tablosuna ekle*/
        try {
            let pool = await sql.connect(webconfig)
            let result = await pool.request()
                .query(`INSERT INTO TBLUsers (Username, Password, Eposta) VALUES ('${un}', '${pw}', '${mail}')`)
            console.log(result)
        }
        catch (err) {
            console.log(err)
        }
    }
);

app.get('/add_admin', cors(), async (req, res) => {
    res.send(adminData);
});

let adminLoginData = {};

app.post('/admin-login', cors(), (req, res) => {
    adminLoginData = req.body;
    res.send('success');
})

app.get('/admin-login', cors(), async (req, res) => {
    res.send(adminLoginData)
})

server.listen(8080, function () {
        console.log('Server listening at port %d', 8080);
    }
);
