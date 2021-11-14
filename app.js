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

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
const route = new mongoose.Schema({
  start: String,
  destination: String,
  path: [String]
});
const parcel = new mongoose.Schema({
  parcelid: String,
  from: String,
  to: String,
  description: String,
  start: String,
  destination: String,
  weight: Number,
  path: [String],
  status: Boolean
})
const traveltime = new mongoose.Schema({
  from: String,
  to: String,
  time: Number
})
const location = new mongoose.Schema({
  location: String
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
  res.render("home");
});


app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/addroute", function (req, res) {
  res.render("addroute");
});
app.get("/searchbyid", function (req, res) {
  res.render("searchbyid")
});
app.get("/dashboard", function (req, res) {
  res.render("dashboard")
});

app.post("/addroute", function (req, res) {
  start = req.body.name[0]
  destination = req.body.name[(req.body.name.length) - 1]
  console.log(start, destination)
  Route.create({ start: start, destination: destination, path: req.body.name })
  console.log(req.body.name)
})
app.get("/addlocation", function (req, res) {
  res.render("addlocation")
})
app.post("/addlocation", function (req, res) {
  Location.create({ location: req.body.location }).then(success => {
    res.redirect("/addlocation")
  }).catch(err => {
    console.log(err)
  })
})
app.get("/addparcel", function (req, res) {
  res.render("addparcel");
});

app.get("/updateparcel", function (req, res) {
  res.render("updateparcel");
});
app.get("/traveltime", function (req, res) {
  res.render("traveltime");
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
    res.redirect("/traveltime")
  });


})
app.post("/updateparcel", function (req, res) {
  parcelid = req.body.parcelid
  newlocation = req.body.newlocation
  Parcel.find({ parcelid: parcelid }).then(parcel => {
    cur_parcel = parcel[0]
    start = cur_parcel.start
    destination = cur_parcel.destination

    Route.find({ start: start, destination: destination }).then(routes => {
      correct_route = routes[0]
      path = correct_route.path
      if (path.includes(newlocation)) {
        //push
        Parcel.findOneAndUpdate({ parcelid: parcelid }, {
          $push: { path: newlocation }
        }).then(updatedparcel => {
          console.log("success")
          res.redirect("/updateparcel")
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
  Parcel.find({ parcelid: parcelid }).then(parcel => {
    path_travelled = parcel[0].path
    start = parcel[0].start
    destination = parcel[0].destination
    cur_location = path_travelled[path_travelled.length - 1]
    Route.find({ start: start, destination: destination }).then(rote => {
      complete_path = rote[0].path
      var i = 0;
      for (i = 0; i < complete_path.length; i++) {
        if (complete_path[i] == cur_location) {
          break;
        }
      }
      remaining_path = complete_path.slice(i, complete_path.length)
      var eta = 0
      async function loop(path) {
        for (let i = 0; i < path.length - 1; i++) {
          times = await Traveltime.find({ "from": path[i], "to": path[i + 1] }).catch(err => {
            console.log(err)
          })
          console.log(times[0].time)
          eta = eta + times[0].time
        }
      }
      loop(remaining_path).then(a => {
        console.log(eta)
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
  const parcelid = Math.random().toString(36).slice(-6);
  Parcel.create({
    parcelid: parcelid, from: req.body.from, to: req.body.to, description: req.body.description, destination: req.body.destination
    , weight: req.body.weight, start: req.body.start, path: [req.body.start], status: true
  })
  res.redirect("/addparcel");
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
        res.redirect("/login");
      });
    }
  });

});

app.post("/login", function (req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/dashboard");
      });
    }
  });

});


app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
