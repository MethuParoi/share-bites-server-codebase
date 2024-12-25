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
    origin: ["http://localhost:5173", "https://share-bites-9867f.web.app"],
    credentials: true,
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: "Content-Type,Authorization",
  })
);
app.use(express.json());
app.use(cookieParser());

// Verify JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("Token received:", token);
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};

//verify jwt token
// const verifyToken = (req, res, next) => {
//   const token = req?.cookies?.token;
//   console.log("token", token);
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

          //after deploying to https
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",

          // secure: false, // set to true after deploying to https
          // sameSite: 'none'
        })
        .send({ success: false });
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
    app.get("/jwt-get", verifyToken, (req, res) => {
      // console.log("User data from token:", req.user);
      // console.log("cookies", req.cookies.token);
      res.send({ success: true });
    });

    //------------------ Add Food----------------------
    //add food
    app.post("/add-food", verifyToken, async (req, res) => {
      // if (req.user.email !== req.query.email) {
      //   console.log("User email:", req.user.email);
      //   console.log("Query email:", req.query.email);
      //   return res.status(403).send("Not authorized");
      // }
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
    app.patch("/update-food/:id", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }

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

    app.delete("/delete-food/:id", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }
      const id = req.params.id;
      // Convert id to ObjectId
      const objectId = new ObjectId(id);
      const result = await foodCollection.deleteOne({ _id: objectId });
      res.send(result);
    });

    //-------------------------------user added food-------------------------------------------
    //added food collection
    const userFoodCollection = client
      .db("share-bites")
      .collection("user-added-food");

    //add food first time
    app.put("/add-user-food", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }
      const newUserFood = req.body;
      const result = await userFoodCollection.insertOne(newUserFood);
      res.send(result);
    });

    // add food
    app.patch("/update-user-food/:id", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }

      const id = req.params.id;
      // Convert id to ObjectId
      const foods = req.body;
      const result = await userFoodCollection.updateOne(
        { user_id: id },
        { $set: foods }
      );
      res.send(result);
    });

    // Delete user added food
    app.delete("/delete-user-food/:id/:fid", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }

      const userId = req.params.id; // User email
      const foodId = req.params.fid; // food ID to delete

      try {
        const result = await userFoodCollection.updateOne(
          { user_id: userId }, // Match user by ID
          { $pull: { foods: foodId } } // Remove the specific food ID from the array
        );

        if (result.modifiedCount > 0) {
          res.status(200).send({ message: "Food deleted" });
        } else {
          res.status(404).send({ message: "Food not found" });
        }
      } catch (error) {
        console.error("Error deleting food:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    //get user food
    app.get("/get-user-food/:id", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }
      const id = req.params.id;

      try {
        // Convert id to ObjectId
        // const objectId = new ObjectId(id);
        const result = await userFoodCollection.findOne({
          user_id: id,
        });

        if (result) {
          res.send(result);
          // res.send("food found");
        } else {
          res.status(404).send({ message: "food not found" });
        }
      } catch (error) {
        console.error("Error fetching food:", error);
        res.status(400).send({ message: "Invalid food ID" });
      }
    });

    //-------------------------------user requested food-------------------------------------------
    //added food collection
    const userRequestedFoodCollection = client
      .db("share-bites")
      .collection("user-requested-food");

    //add requested food first time
    app.put("/add-requested-food", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }

      const newUserFoodRequest = req.body;
      const result = await userRequestedFoodCollection.insertOne(
        newUserFoodRequest
      );
      res.send(result);
    });

    // add requested food
    app.patch("/update-requested-food/:id", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }

      const id = req.params.id;
      // Convert id to ObjectId
      const foods = req.body;
      const result = await userRequestedFoodCollection.updateOne(
        { user_id: id },
        { $set: foods }
      );
      res.send(result);
    });

    // Delete requested food
    app.delete(
      "/delete-requested-food/:id/:fid",
      verifyToken,
      async (req, res) => {
        // Check if user is same as in the token
        // if (req.user.email !== req.query.email) {
        //   return res.status(403).send("Not authorized");
        // }

        const userId = req.params.id; // User email
        const foodId = req.params.fid; // food ID to delete

        try {
          const result = await userRequestedFoodCollection.updateOne(
            { user_id: userId }, // Match user by ID
            { $pull: { foods: foodId } } // Remove the specific food ID from the array
          );

          if (result.modifiedCount > 0) {
            res.status(200).send({ message: "Food deleted" });
          } else {
            res.status(404).send({ message: "Food not found" });
          }
        } catch (error) {
          console.error("Error deleting food:", error);
          res.status(500).send({ message: "Internal server error" });
        }
      }
    );

    //get user requested food
    app.get("/get-requested-food/:id", verifyToken, async (req, res) => {
      // Check if user is same as in the token
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send("Not authorized");
      // }

      const id = req.params.id;

      try {
        // Convert id to ObjectId
        // const objectId = new ObjectId(id);
        const result = await userRequestedFoodCollection.findOne({
          user_id: id,
        });

        if (result) {
          res.send(result);
          // res.send("food found");
        } else {
          res.status(404).send({ message: "food not found" });
        }
      } catch (error) {
        console.error("Error fetching food:", error);
        res.status(400).send({ message: "Invalid food ID" });
      }
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
