require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

//use middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: "Content-Type,Authorization",
  })
);
app.use(express.json());
app.use(cookieParser());

//verify jwt token
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    // console.log("decoded", decoded);
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};

//mongoDB connection

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@share-bites-cluster.blv9c.mongodb.net/?retryWrites=true&w=majority&appName=share-bites-cluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // add a new food
    const foodCollection = client.db("share-bites").collection("food-bank");
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    //------------------------------------------
    //jwt authentication
    app.post("/jwt-auth", (req, res) => {
      const { email } = req.body;
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false, // set to true after deploying to https
          // sameSite: 'none'
        })
        .send({ success: true });
    });

    //logout
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    //jwt get
    app.get("/jwt-get", async (req, res) => {
      console.log("cookies", req.cookies);
      res.send({ success: true });
    });

    //----------------------- Add Food----------------------------
    //add food
    app.post("/add-food", async (req, res) => {
      const newFood = req.body;
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    });

    //get food
    app.get("/get-food", async (req, res) => {
      const result = await foodCollection.find({}).toArray();
      res.send(result);
    });

    //get featured food
    app.get("/get-featured-food", async (req, res) => {
      const result = await foodCollection
        .aggregate([
          {
            $addFields: {
              food_quantity_num: { $toInt: "$food_quantity" },
            },
          },
          {
            $sort: { food_quantity_num: -1 },
          },
          {
            $limit: 6,
          },
        ])
        .toArray();
      res.send(result);
    });

    //get single food details
    app.get("/get-food-details/:id", async (req, res) => {
      const id = req.params.id;
      const objectId = new ObjectId(id);
      const result = await foodCollection.findOne({ _id: ObjectId });
      res.send(result);
    });

    //get sorted food by expiry date
    app.get("/get-sorted-food", async (req, res) => {
      const result = await foodCollection
        .aggregate([
          {
            $addFields: {
              food_expiry_date: {
                $dateFromString: {
                  dateString: "$expired_date",
                },
              },
            },
          },
          {
            $sort: { food_expiry_date: 1 },
          },
        ])
        .toArray();
      res.send(result);
    });

    //update a food
    app.patch("/update-food/:id", async (req, res) => {
      const id = req.params.id;
      // Convert id to ObjectId
      const objectId = new ObjectId(id);
      const updatedFood = req.body;
      const result = await foodCollection.updateOne(
        { _id: objectId },
        { $set: updatedFood }
      );
      res.send(result);
    });

    // Delete a food

    app.delete("/delete-food/:id", async (req, res) => {
      const id = req.params.id;
      // Convert id to ObjectId
      const objectId = new ObjectId(id);
      const result = await foodCollection.deleteOne({ _id: objectId });
      res.send(result);
    });
  } catch (error) {
    console.log(error);
  }

  
}
run().catch(console.dir);

//-------------------------------------

// const rootRouter = require("./routes/index");
// app.use("/api", rootRouter);

app.get("/", (req, res) => {
  res.send("ShareBites server running");
});

const port = process.env.PORT || 3000;
app.listen(port, (err) => {
  if (err) {
    console.log(err);
  }
  console.log(`listening on port: ${port}`);
});
