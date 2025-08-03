const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/profile', isLoggedIn, (req, res) => {
  console.log(req.user);
  res.render('login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/register', async (req, res) => {
  let { username, name, age, email, password } = req.body;

  let user = await userModel.findOne({email});
  if (user) return res.status(500).send('User already exists');

  bcrypt.genSalt(10, async (err, salt) => {
    if (err) return res.status(500).send('Error generating salt');
    bcrypt.hash(password, salt, async (err, hash) => {
      if (err) return res.status(500).send('Error hashing password');
      let user = await userModel.create({
        username,
        name,
        age,
        email,
        password: hash
      });
      let token = jwt.sign({ email: email, userid: user._id }, 'secretkey');
      res.cookie('token', token);
      res.send('User registered successfully');
    });
  });
});

app.post('/login', async (req, res) => {
  let { email, password } = req.body;

  let user = await userModel.findOne({ email });
  if (!user) return res.status(400).send('Invalid email or password');

  bcrypt.compare(password, user.password, (err, result) => {
    if (err) return res.status(500).send('Error comparing passwords');
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, 'secretkey');
      res.cookie('token', token);
      res.status(200).send('User logged in successfully');
    } else {
      res.status(400).send('Invalid email or password');
    }
  });
});

app.get('/logout', (req, res) => {
  res.cookie('token', '');
  res.redirect('/login');
});


function isLoggedIn(req, res, next) {
  if(req.cookies.token === '') res.send("You are not logged in");
  else {
    let data = jwt.verify(req.cookies.token, 'secretkey');
    req.user = data;
  }
  next();
}
app.listen(2000);



// express module ko import kiya, app banaya
// userModel aur postModel ko import kiya (user aur post schema/model ke liye)
// cookie-parser ko import kiya (cookies handle karne ke liye)
// bcrypt ko import kiya (password hash karne ke liye)
// jsonwebtoken ko import kiya (JWT banane ke liye)

// view engine ko 'ejs' set kiya (dynamic HTML render karne ke liye)
// express.urlencoded middleware use kiya (form data parse karne ke liye)
// cookieParser middleware use kiya (cookies parse karne ke liye)
// express.json middleware use kiya (JSON data parse karne ke liye)

// '/' route banaya, jo index.ejs render karta hai

// /profile route banaya, jo sirf logged in user ke liye hai (isLoggedIn middleware lagaya)
// /login route banaya, jo login.ejs render karta hai

// /register route banaya, jo naya user register karta hai:
//   - pehle check karta hai ki user already exist to nahi karta
//   - password ko hash karta hai bcrypt se
//   - user create karta hai database me
//   - JWT token banata hai aur cookie me set karta hai

// /login route banaya, jo user ko login karta hai:
//   - email se user find karta hai
//   - password compare karta hai bcrypt se
//   - agar password sahi hai to JWT token banata hai aur cookie me set karta hai

// /logout route banaya, jo token cookie ko empty kar deta hai aur login page pe redirect karta hai

// isLoggedIn middleware banaya, jo check karta hai ki user logged in hai ya nahi (JWT verify karta hai)

// server ko port 2000 pe listen karwaya
