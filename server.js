const express = require('express');
const app = express();
const server = require('http').createServer(app);
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('mssql')
const session = require('express-session');

const cookieParser = require('cookie-parser');

const webconfig = {
    user: "sa",
    password: "123456",
    database: "survey",
    server: 'DESKTOP-L630DBC',
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

app.use(express.json());

app.use(
    cors(
        // {
        // origin: ["http://localhost:8080/"],
        // methods: ["GET", "POST"],
        // credentials: true,
        // }
    )
);

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    key: "userId",
    secret: "secretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60 * 60 * 24
    }
}))

app.use(bodyParser.json());
/*run this server in 8080*/

app.get('/', cors(), async (req, res) => {
    res.send('working!')
});

let questionsData = [];
let surveyName = ""

//survey_name endpointinden gelen datayı alıyoruz
app.post('/survey_name', cors(), async (req, res) => {
    surveyName = req.body;
    console.log(surveyName.surveyName);
    res.send('working!')
});

app.get('/survey_name', cors(), async (req, res) => {
    res.send(surveyName)
});

//oluşturulan anket verisini post eder
app.post("/question_data", cors(), async (req, res) => {
    questionsData = req.body;
    res.send(JSON.stringify((questionsData)));
    let pool = await sql.connect(webconfig);
    let guid = String(Date.now());

    for (let i = 0; i < questionsData.questionsData.length; i++) {

        try {
            let result = await pool.request()
                .query(`INSERT INTO TBLSorular (SoruID, Guid, TextSoru, Tip, IsActive, IsDeleted) values ('${questionsData.questionsData[i].id}','${guid}', '${questionsData.questionsData[i].question}', '${questionsData.questionsData[i].type}', 1, 0)`);
        }
        catch (err) {
            console.log(err);
        }
        for (let j = 0; j < questionsData.questionsData[i].answers?.length; j++) {
            try {
                let result = await pool.request()
                    .query(`INSERT INTO TBLCevaplar (SoruID, TextCevap, IsActive, IsDeleted) values ('${questionsData.questionsData[i].answers[j].qid}', '${questionsData.questionsData[i].answers[j].answer}', 1, 0)`);
            }
            catch (err) {
                console.log(err);
            }
        }
    }
    try {
        let result = await pool.request()
            .query(`INSERT INTO TBLAnket (AnketAdi, Guid, IslemTarihi, IsActive, IsDeleted) values ('${surveyName.surveyName}', '${guid}', GETDATE(), 1, 0)`);
    }
    catch (err) {
        console.log(err.message);
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
    console.log("Session: " + req.session.adminSession);
});

let adminLoginData = {};
let loginStatus = false

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
                loginStatus = true
            } else {
                res.send('error')
                loginStatus=false
            }
        })
    }
    catch (err) {
        // console.log(err)
    }
})

app.get('/admin-login', cors(), async (req, res) => {
    res.send(loginStatus)
})

app.post('/log-out', cors(), async (req, res) => {
    loginStatus = false
})

app.post('/surveys', cors(), async (req, res) => {
    let queryString = "SELECT S.* ,CASE WHEN S.IsActive = 1 THEN 'Anket Aktif' ELSE 'Anket Pasif Durumdadır.' END AS AnketDurumu, xx.AnketiYapanKullaniciSayisi, yy.SoruSayisi FROM TBLAnket AS S WITH (NOLOCK) OUTER APPLY (SELECT COUNT(*) as AnketiYapanKullaniciSayisi from TBLAnketCevap AS K WITH (NOLOCK) WHERE K.Guid = S.Guid)xx OUTER APPLY (SELECT COUNT(*) as SoruSayisi FROM TBLSorular as AnketSoruSayisi WHERE S.Guid = AnketSoruSayisi.Guid)yy"
    let pool = await sql.connect(webconfig);

    await pool.query(queryString, (err, data) => {
        if (err) console.log(err.message)

    })

})

app.get('/surveys', cors(), async (req, res) => {
    let queryString = "SELECT S.* ,CASE WHEN S.IsActive = 1 THEN 'Anket Aktif' ELSE 'Anket Pasif Durumdadır.' END AS AnketDurumu, xx.AnketiYapanKullaniciSayisi, yy.SoruSayisi FROM TBLAnket AS S WITH (NOLOCK) OUTER APPLY (SELECT COUNT(*) as AnketiYapanKullaniciSayisi from TBLAnketCevap AS K WITH (NOLOCK) WHERE K.Guid = S.Guid)xx OUTER APPLY (SELECT COUNT(*) as SoruSayisi FROM TBLSorular as AnketSoruSayisi WHERE S.Guid = AnketSoruSayisi.Guid)yy"
    let pool = await sql.connect(webconfig);

    await pool.query(queryString, (err, data) => {
        if (err) console.log(err.message)
        res.send(data.recordset)
    })
})

app.post('/save-selected', cors(), async(req, res) => {

    let guid = req.body.guid
    let questionId = req.body.questionId
    let answerId = req.body.answerId

    let queryString = `INSERT INTO TBLAnketCevap (Guid, SoruID, CevapID) values ('${guid}', '${questionId}', '${answerId}')`

    let pool = await sql.connect(webconfig) //neden her requestte dbye tekrar bağlanıyoruz amk bence bunu dışarıda tutmak lazım - samet
    await pool.request()
    .query(queryString)
})

app.get('/get-selected', cors(), async (req, res) => {
    let queryString = "SELECT * FROM TBLAnketCevap"
    let pool = await sql.connect(webconfig);
    await pool.query(queryString, (err, data) => {
        if (err) console.log(err.message)
        res.send(data.recordset)
    })
})

app.post('/get-answer-count', cors(), async (req,res) => {
    let qid = req.body.qid
    let aid = req.body.aid

    let queryString = `SELECT COUNT(CevapID) as sayi FROM TBLAnketCevap WHERE SoruID = '${qid}' AND CevapID='${aid}'`
    let pool = await sql.connect(webconfig)

    await pool.query(queryString, (err, data) => {
        if (err) console.log(err.message)
        res.send(String(data.recordset[0].sayi))

    })
})

app.post('/survey-input', cors(), async (req, res) => {
    let surveyGuid = req.body.guid;
    let queryString = `SELECT * FROM TBLSorular WHERE Guid = '${surveyGuid}'`
    // let queryString2 = `SELECT A.ID AS SORUNUNID, A.Guid, A.TextSoru AS SORUNUNTEXT,A.Tip AS SORUNUNTIPI,Q.ID AS CEVABINID,Q.TextCevap AS CEVABINTEXTI, T.AnketAdi FROM TBLSorular as A WITH (NOLOCK) LEFT JOIN TBLCevaplar AS Q WITH (NOLOCK) ON A.SoruID = Q.SoruID LEFT JOIN TBLAnket AS T WITH (NOLOCK) ON A.Guid = T.Guid WHERE A.Guid='${surveyGuid}'`
    let pool = await sql.connect(webconfig)
    await pool.query(queryString, (err, data) => {
        if (err) {
            console.log(err.message);
        }
        console.log(data.recordset)
        res.send(data.recordset);
    })
})

app.post('/get-survey-name', cors(), async (req, res) => {

    let guid = req.body.guid
    let queryString = `SELECT AnketAdi FROM TBLAnket WHERE Guid = '${guid}'`
    let pool = await sql.connect(webconfig)

    await pool.query(queryString, (err, data) => {
        if (err) {
            console.log(err.message);
        }
        res.send(data.recordset[0].AnketAdi)
    })
})

app.post('/answers', cors(), async (req, res) => {

    let queryString = `SELECT * FROM TBLCevaplar`
    let pool = await sql.connect(webconfig)
    await pool.query(queryString, (err, data) => {
        if (err) {
            console.log(err.message);
        }
        res.send(data.recordset);
    })
})

app.post('/distinct-answer-count', cors(), async (req, res) => {
    let soruid = req.body.soruid
    let pool = await sql.connect(webconfig)
    let queryString = `SELECT DISTINCT CevapID FROM TBLAnketCevap WHERE SoruID = '${soruid}'`

    await pool.query(queryString, (err,data ) => {
        if(err) {
            console.log(err)
        }
        res.send(data.recordset)
        console.log(data.recordset)
    })
})

server.listen(8080, function () {
    console.log('Server listening at port %d', 8080);
}
);
