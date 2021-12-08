//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/CMS", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  Name: String,
  PhoneNumber: String,
  Age: Number
});
const route = new mongoose.Schema({
  routeid: {
    type: String,
    unique: true
  },
  start: String,
  destination: String,
  path: [String]
});
const parcel = new mongoose.Schema({
  parcelid: {
    type: String,
    unique: true
  },
  from: String,
  to: String,
  description: String,
  start: String,
  destination: String,
  weight: Number,
  path: [{
    location: String,
    timestamp: String,
    arrival_time: String
  }],
  status: Boolean
})
const traveltime = new mongoose.Schema({
  from: String,
  to: String,
  time: Number
})
const location = new mongoose.Schema({
  location: {
    type: String,
    unique: true
  }
})
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Route = new mongoose.model("Route", route);
const Parcel = new mongoose.model("Parcel", parcel);
const Traveltime = new mongoose.model("Traveltime", traveltime);
const Location = new mongoose.model("Location", location);


passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function (req, res) {
  sess = req.session;
  sess.loggedInUser;
  res.render("home");
});


app.get("/login", function (req, res) {

  res.render("login");
});

app.get("/register", function (req, res) {

  res.render("register");
});

app.get("/addroute", function (req, res) {
  if (req.session.loggedInUser) {
    Location.find().then(data => {
      res.render("addroute", { data: JSON.stringify(data) });
    })
  }
  else {
    res.render("login");
  }

});
app.get("/searchbyid", function (req, res) {
  res.render("searchbyid");
});

app.get("/dashboard", function (req, res) {
  if (req.session.loggedInUser) {
    res.render("dashboard")
  }
  else {
    res.render("login");
  }

});
app.post("/alert", function (req, res) {
  res.render("alerts", { message: req.body.message, route: req.body.route })
})
app.post("/addroute", function (req, res) {
  start = req.body.location[0]
  destination = req.body.location[(req.body.location.length) - 1]
  Route.create({ routeid: start + destination, start: start, destination: destination, path: req.body.location })
  res.redirect("/dashboard")

})
app.post("/deletebyid", function (req, res) {
  id = req.body.parcelid
  console.log(id)
  Parcel.deleteOne({ parcelid: id }).then(p => {
    res.redirect("/viewallparcels")
  })
})
app.get("/viewallparcels", function (req, res) {
  Parcel.find({}).then(details => {
    console.log(details)
    res.render("viewallparcels", { details: details })
  })

})
app.get("/addlocation", function (req, res) {
  if (req.session.loggedInUser) {
    res.render("addlocation")
  }
  else {
    res.render("login");
  }
})
app.post("/addlocation", function (req, res) {
  Location.create({ location: req.body.location }).then(success => {
    res.render("alert", { message: "location added successfully", hre: "addlocation" })
  }).catch(err => {
    console.log(err)
  })
})
app.get("/addparcel", function (req, res) {
  if (req.session.loggedInUser) {
    Location.find().then(data => {
      res.render("addparcel", { data: JSON.stringify(data) });
    })
  }
  else {
    res.render("login");
  }
});

app.get("/updateparcel", function (req, res) {
  if (req.session.loggedInUser) {
    Location.find().then(data => {
      res.render("updateparcel", { data: JSON.stringify(data) });
    })
  }
  else {
    res.render("login");
  }
});
app.get("/traveltime", function (req, res) {
  if (req.session.loggedInUser) {
    Location.find().then(data => {
      res.render("traveltime", { data: JSON.stringify(data) });
    })
  }
  else {
    res.render("login");
  }
});
app.post("/traveltime", function (req, res) {
  from = req.body.from
  to = req.body.to
  newtime = req.body.newtime
  filter = {
    "from": from,
    "to": to
  };
  update = {
    "time": newtime
  }
  Traveltime.findOneAndUpdate(filter, update, { new: true, upsert: true }).then(suc => {
    res.render("alert", { message: "travel time updated successfully", hre: "traveltime" })
  });


})
app.post("/updateparcel", function (req, res) {
  parcelid = req.body.parcelid
  newlocation = req.body.location
  date = req.body.date
  time = req.body.time
  Parcel.find({ parcelid: parcelid }).then(parcel => {
    cur_parcel = parcel[0]
    start = cur_parcel.start
    destination = cur_parcel.destination
    Route.find({ start: start, destination: destination }).then(routes => {
      correct_route = routes[0]
      path = correct_route.path
      x = { location: newlocation, timestamp: date, arrival_time: time }
      if (path.includes(newlocation)) {
        //push
        Parcel.findOneAndUpdate({ parcelid: parcelid }, {
          $push: { path: x }
        }).then(updatedparcel => {
          res.render("alert", { message: "Parcel location updated successfully", hre: "updateparcel" })
        }).catch(err => {
          console.log(err)
        })
      }
      else {
        Parcel.findOneAndUpdate({ parcelid: parcelid }, { status: false }).then(ret => {
          res.redirect("/updateparcel")
        })
      }
    })
  }).catch(err => {
    message = { err: "Wrong ID" }
    res.render("updateparcel", message)
  })

});


app.post("/searchbyid", function (req, res) {
  parcelid = req.body.parcelid
  Parcel.findOne({ parcelid: parcelid }).then(parcel => {
    path_travelled = []
    timestamps = []
    arrival_times = []
    for (var i = 0; i < parcel.path.length; i++) {
      path_travelled.push(parcel.path[i]["location"])
      timestamps.push(parcel.path[i]["timestamp"])
      arrival_times.push(parcel.path[i]["arrival_time"])
    }
    start = parcel.start
    destination = parcel.destination
    cur_location = path_travelled[path_travelled.length - 1]
    Route.findOne({ start: start, destination: destination }).then(route => {
      complete_path = route.path
      for (var i = 0; i < complete_path.length; i++) {
        if (complete_path[i] == cur_location) {
          break;
        }
      }
      remaining_path = complete_path.slice(i, complete_path.length)
      var eta = 0
      remaining = []
      async function loop(path) {
        for (let i = 0; i < path.length - 1; i++) {
          times = await Traveltime.find({ "from": path[i], "to": path[i + 1] }).catch(err => {
            console.log(err)
          })
          eta = eta + times[0].time
          x = { location: remaining_path[i + 1], timestamp: eta }
          remaining.push(x)
        }
      }
      loop(remaining_path).then(a => {
        console.log(eta)
        console.log(parcel);
        remaining_path = remaining_path.slice(1, remaining_path.length)
        console.log(remaining_path);
        lnt = []
        for (var i = 0; i < path_travelled.length; i++) {
          x = { location: path_travelled[i], timestamp: timestamps[i], arrival_time: arrival_times[i] }
          lnt.push(x)
        }
        console.log("l")
        console.log(lnt)
        res.render("orderdetails", { delivered: lnt, to_be_delivered: remaining, timestamps: timestamps, parcel_id: parcelid })
      })

    })

  })

  /*
  Traveltime.aggregate([{
    $match:
      { $or: [{ "from": "chennai", "to": "hyd" }, { "from": "hyd", "to": "delhi" }] }
  }]).then(ans => {
    console.log(ans)
  })
  */
  /*
    Parcel.find({ parcelid: parcelid }).then(parcel => {
      console.log(parcel)
      path_travelled = parcel.path
      start = parcel.start
      destination = parcel.destination
      Route.find({ start: start, destination: destination }).then(arr => {
        full_path = arr.path
  
      })
    })*/
})
app.post("/addparcel", function (req, res) {
  const parcelid = Math.random().toString(36).slice(-6).toUpperCase();

  Parcel.create({
    parcelid: parcelid, from: req.body.from, to: req.body.to, description: req.body.description, destination: req.body.destination
    , weight: req.body.weight, start: req.body.start, path: { location: req.body.start, timestamp: req.body.date, arrival_time: req.body.time }, status: true
  })
  res.render("alert", { message: "Parcel added successfully , Your parcelid is " + parcelid, hre: "addparcel" })
});
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {

  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.render("alert", { message: "User Registered successfully", hre: "login" })
      });
    }
  });

});
app.get("/orderdetails", function (req, res) {
  delivered = ["Hyderabad", "Delhi"]
  to_be_delivered = ["USA"]
  res.render("orderdetails", { delivered: delivered, to_be_delivered: to_be_delivered })
})
app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      sess = req.session;
      sess.loggedInUser = true;
      passport.authenticate("local")(req, res, function () {

        res.redirect("/dashboard");
      });
    }
  });

});
app.post("/apply1", function (req, res) {
  res.redirect("/" + req.body.li);
});


app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
