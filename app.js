const express = require('express');
const app = express();

const userModel = require('./models/user');
const postModel = require('./models/posts')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const multer = require('multer');
const path = require('path');


app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use('/uploads', express.static('uploads'));
app.use(cookieParser());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Set the destination folder for uploads
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Set the filename
    }
});

const upload = multer({ storage: storage });

app.get('/', (req,res)=>{
    res.render('index');
})

app.post('/register', async (req,res)=>{
    let {email, password, username, name, age} = req.body;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    let user = await userModel.findOne({username});
    if(user) return res.status(500).send("username already taken");
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt, async (err,hash)=>{
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password:hash
            });

            let token = jwt.sign({username:username, userid: user._id}, "secret");
            res.cookie("token", token);
            res.redirect("profile");
        })
    })

})

app.get('/login', (req,res)=>{
    res.render('login');
})

app.post('/login', async (req, res) => {
    let { username, password } = req.body;
    let user = await userModel.findOne({ username });
    if (!user) return res.status(401).send("User not found");

    bcrypt.compare(password, user.password, (err, result) => {
        if (err) return res.status(500).send("Error comparing passwords");
        
        if (result) {
            let token = jwt.sign({ username: username, userid: user._id }, "secret");
            res.cookie("token", token);
            return res.status(200).redirect("/profile");
        } else {
            return res.status(401).send("Invalid password");
        }
    });
});


app.get('/logout',(req,res)=>{
    res.cookie("token", "");
    res.redirect("/");
})

app.get('/profile', isLoggedIn, async (req,res)=>{
    try {
        // Fetch the user and populate the posts array with the post data
        let user = await userModel.findOne({ username: req.user.username }).populate('post');
        
        // Render the profile page with user data and posts
        res.render("profile", { user });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error fetching user profile');
    }
})

function isLoggedIn(req,res,next){
    if(req.cookies.token === "") return res.redirect("/")
    else{
        let data = jwt.verify(req.cookies.token,"secret");
        req.user = data;
    }
    next();
}

app.get('/upload', (req, res) => {
    res.render('upload', { imagePath: null, caption: null, mood: null });
});


app.post('/upload', isLoggedIn, upload.single('image'), async (req, res) => {
    try {
        // Create a new post with the uploaded image data
        const newPost = new postModel({
            image: '/uploads/' + req.file.filename, // Save the file path of the uploaded image
            caption: req.body.caption || '', // Optional caption
            mood: req.body.mood || '', // Optional mood
            user: req.user.userid  // Reference to the user who uploaded the post
        });

        // Save the post to the database
        await newPost.save();

        // Add the post's ObjectId to the user's "post" array
        await userModel.findByIdAndUpdate(req.user.userid, { $push: { post: newPost._id } });

        // Redirect to the user's profile to see the uploaded image
        res.redirect('/profile');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error uploading image');
    }
});


app.listen(3000);