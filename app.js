const express = require('express');
const app = express();
const mongoose = require('mongoose');
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const post = require('./models/post');
const crypto = require('crypto');
const path = require('path');
const multerconfig = require('./config/multerconfig');
const upload = require('./config/multerconfig');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/profile/upload', (req, res) => {
  res.render('profileupload');
});

app.post('/upload',isLoggedIn, upload.single('profilepic'), async (req, res) => {
  let user = await userModel.findOne({email: req.user.email});
  user.profilepic = req.file.filename;
  await user.save();
  res.redirect('/profile');
});

app.get('/profile', isLoggedIn,async (req, res) => {
  let user = await userModel.findOne({email: req.user.email}).populate('posts');
  res.render('profile' , { user });
});


app.get('/like/:id', isLoggedIn,async (req, res) => {
  let post = await postModel.findOne({_id: req.params.id}).populate('user');

  if(post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect('/profile');
});

app.get('/edit/:id', isLoggedIn,async (req, res) => {
  let post = await postModel.findOne({_id: req.params.id}).populate('user');

  res.render('edit', { post });
});


app.post('/update/:id', isLoggedIn, async (req, res) => {
  const { content } = req.body;
  await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: content }
  );
  res.redirect('/profile');
});

app.post('/post', isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({email: req.user.email});
  let { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect('/profile');
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
      res.redirect('/profile');
      console.log("User registered successfully");
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
      res.status(200).redirect('/profile');
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
  if(req.cookies.token === '') res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token, 'secretkey');
    req.user = data;
  }
  next();
}
app.listen(2000);
console.log('Server is running on port 2000');


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

/* Naye comments (Hinglish me):

// /post route add kiya, jo logged in user ke liye naya post create karta hai:
//   - user ko find karta hai JWT ke email se
//   - post create karta hai postModel me (user ki id aur content ke saath)
//   - user ke posts array me naya post add karta hai
//   - user ko save karta hai database me
//   - profile page pe redirect karta hai

// profile route me populate('posts') use kiya, taki user ke saare posts bhi mil jayein

// logout route me token cookie ko empty string set kiya (logout karne ke liye)

// isLoggedIn middleware me JWT token verify kiya, aur req.user me user ka data daala
*/

/* Updates

// /like/:id route banaya, jo post ko like/unlike karta hai:
//   - post ko find karta hai postModel se (id ke basis pe)
//   - agar user ne post like nahi kiya hai to likes array me user ki id daal deta hai
//   - agar already like kiya hai to likes array se user ki id hata deta hai
//   - post ko save karta hai database me
//   - profile page pe redirect karta hai

// /edit/:id route banaya, jo post ko edit karne ke liye edit.ejs render karta hai:
//   - post ko find karta hai postModel se (id ke basis pe)
//   - edit.ejs ko render karta hai post ke data ke saath

// /update/:id route banaya, jo post ko update karta hai:
//   - post ki content ko update karta hai postModel me (id ke basis pe)
//   - profile page pe redirect karta hai

*/
