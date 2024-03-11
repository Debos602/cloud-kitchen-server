const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//middlewar
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gdk9eql.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

function verifyJWT(req, res, next) {
	console.log(req.headers.authorization);

	const authHeader = req.headers.authorization;
	if (!authHeader) {
		res.status(401).send({ message: "unauthorized access" });
	}
	const token = authHeader.split(" ")[1];

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
		if (error) {
			res.status(403).send({ message: "unauthorized access" });
		}
		req.decoded = decoded;
		next();
	});
}

async function run() {
	try {
		const serviceCollection = client.db("CloudKitchen").collection("services");
		const reviewCollection = client.db("CloudKitchen").collection("review");

		app.post("/jwt", (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "1h",
			});
			res.send({ token });
		});

		// get all data
		app.get("/services", async (req, res) => {
			const page = req.query.page;
			const size = parseInt(req.query.size);
			const query = {};
			const cursor = serviceCollection.find(query);
			const services = await cursor
				.skip(page * size)
				.limit(size)
				.toArray();
			const count = await serviceCollection.estimatedDocumentCount();
			res.send({ count, services });
		});
		// get single data

		app.get("/services/:id", async (req, res) => {
			const id = req.params.id;
			// console.log(id);
			const query = { _id: new ObjectId(id) };
			const service = await serviceCollection.findOne(query);
			res.send(service);
		});

		app.get("/reviews", verifyJWT, async (req, res) => {
			// console.log(req.query.email);

			const decoded = req.decoded;
			console.log("inside kitchen api", decoded);
			if (decoded?.email !== req.query.email) {
				res.status(403).send({ message: "Forbidden access" });
			}

			let query = {};
			if (req.query.email) {
				query = {
					email: req.query.email,
				};
			}

			const cursor = reviewCollection.find(query);
			const reviews = await cursor.toArray();
			res.send(reviews);
		});

		// review api

		app.post("/review", async (req, res) => {
			const review = req.body;
			const result = await reviewCollection.insertOne(review);
			res.send(result);
		});

		app.post("/addservice", async (req, res) => {
			const newService = req.body;
			const result = await serviceCollection.insertOne(newService);
			res.send(result);
		});

		app.put("/myreview/:id", async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const editedReview = req.body;
			const updateReview = {
				$set: {
					message: editedReview.message,
				},
			};

			const result = await reviewCollection.updateOne(filter, updateReview);
			res.send(result);
		});

		app.delete("/review/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await reviewCollection.deleteOne(query);
			res.send(result);
		});
	} finally {
	}
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
	res.send("cloud kitchen server is running");
});

app.listen(port, () => {
	console.log(`cloud kitchen server running on port ${port}`);
});
