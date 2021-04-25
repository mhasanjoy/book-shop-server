const express = require('express');
const app = express();
require('dotenv').config();
const port = 5000 || process.env.PORT;

const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send("Welcome!");
});

const admin = require("firebase-admin");
const serviceAccount = require("./configs/book-shop-d5432-firebase-adminsdk-kclku-d4734b3796.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.DB_NAME}.firebaseio.com`
});

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gidxw.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const booksCollection = client.db(`${process.env.DB_NAME}`).collection("books");
    const ordersCollection = client.db(`${process.env.DB_NAME}`).collection("orders");

    app.post('/addBook', (req, res) => {
        const book = req.body;
        booksCollection.insertOne(book)
            .then(result => {
                res.send(result.insertedCount > 0);
            });
    });

    app.get('/allBooks', (req, res) => {
        booksCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            });
    });

    app.delete('/delete/:id', (req, res) => {
        const id = ObjectId(req.params.id);
        booksCollection.deleteOne({ _id: id })
            .then(result => {
                res.send(result.deletedCount > 0);
            });
    });

    app.get('/book/:id', (req, res) => {
        const id = ObjectId(req.params.id);
        booksCollection.find({ _id: id })
            .toArray((err, documents) => {
                res.send(documents[0]);
            });
    });

    app.post('/addOrder', (req, res) => {
        const order = req.body;
        ordersCollection.insertOne(order)
            .then(result => {
                res.send(result.insertedCount > 0);
            });
    });

    app.get('/orders', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith("Bearer ")) {
            const idToken = bearer.split(" ")[1];

            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail === queryEmail) {
                        ordersCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.send(documents);
                            });
                    }
                    else {
                        res.status(401).send('Unauthorized Access');
                    }
                })
                .catch((error) => {
                    res.status(401).send('Unauthorized Access');
                });
        }
        else {
            res.status(401).send('Unauthorized Access');
        }
    });
});

app.listen(port);