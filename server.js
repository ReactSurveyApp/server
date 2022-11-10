

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
    server: 'ABS-DEV',
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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())
app.use(bodyParser.json());
/*run this server in 8080*/

app.get('/', cors(), async (req, res) => {
    res.send('working!')
});

let questionsData = [];

//oluşturulan anket verisini post eder
app.post("/question_data", cors(), async (req, res) => {
    questionsData = req.body;
    res.send(JSON.stringify((questionsData)));
    let pool = await sql.connect(webconfig);
    let guid = String(Date.now()) ;
    for (let i = 0; i < questionsData.questionsData.length; i++) {
        console.log(questionsData.questionsData[i].question);
        
        try {
            let result = await pool.request()
            .query(`INSERT INTO TBLSorular (Guid, TextSoru, Tip, IsActive, IsDeleted) values ('${guid}', '${questionsData.questionsData[i].question}', 'Çoktan Seçmeli', 1, 0)`);
        }
        catch (err) {
            console.log(err);
        }
        
        for (let j = 0; j < questionsData.questionsData[i].answers.length; j++) {
            try {
                let result = await pool.request()
                .query(`INSERT INTO TBLCevaplar (SoruID, TextCevap, IsActive, IsDeleted) values ('${questionsData.questionsData[i].answers[j].qid}', '${questionsData.questionsData[i].answers[j].answer}', 1, 0)`);
            }
            catch (err) {
                console.log(err);
            }
        }
    }
}
);

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
        // console.log(result)
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

app.post('/admin-login', cors(), async (req, res) => {
    adminLoginData = req.body;
    let un = (adminLoginData.username)
    let pw = (adminLoginData.password)
    // res.send('success');
    try {
        let pool = await sql.connect(webconfig)
        await pool.query(`SELECT * FROM TBLUsers WHERE Username = N'${un}' AND Password = N'${pw}'`, (err, data) => {
            if (err) {
                throw err;
            }
            // console.log(data.recordset.length)
            if (data.recordset.length > 0) {
                res.send('success')
            } else {
                res.send('error')
            }
        })
    }
    catch (err) {
        // console.log(err)
    }
})

app.get('/admin-login', cors(), async (req, res) => {
    res.send(adminLoginData)
})

server.listen(8080, function () {
    console.log('Server listening at port %d', 8080);
}
);
