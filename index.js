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
// const verifyToken = (req, res, next) => {
//   const token = req?.cookies?.token;
//   if (!token) {
//     return res.status(403).send("A token is required for authentication");
//   }
//   try {
//     const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     req.user = decoded;
//     // console.log("decoded", decoded);
//   } catch (err) {
//     return res.status(401).send("Invalid Token");
//   }
//   return next();
// };

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
    // add a new movie
    const movieCollection = client.db("share-bites").collection("food-bank");
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    //------------------------------------------
    //jwt authentication
    app.post("/jwt-auth", (req, res) => {
      const { email } = req.body;
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
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
    // app.post("/logout", (req, res) => {
    //   res
    //     .clearCookie("token", {
    //       httpOnly: true,
    //       secure: false,
    //     })
    //     .send({ success: true });
    // });

    //jwt get
    app.get("/jwt-get", async (req, res) => {
      console.log("cookies", req.cookies);
      res.send({ success: true });
    });

    //---------------------------------------------------
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
