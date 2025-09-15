const express = require('express');
const app = express();

const userModel = require('./models/user');
const postModel = require('./models/posts');

const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const multer = require('multer');

const storage = multer.memoryStorage();
const path = require('path');
const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/projectUnfiltered");

app.set("view engine", "ejs");

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

app.use(cookieParser());

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|gif)$/.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG & GIF images allowed'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // e.g. 5 MB max
});


app.get('/', (req, res) => {
    res.render('index');
})

app.post('/register', async (req, res) => {
    let { email, password, username, name, bio } = req.body;

    name = name.charAt(0).toUpperCase() + name.slice(1);

    let user = await userModel.findOne({ username });

    if (user) return res.status(500).send("username already taken");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => { 
            let user = await userModel.create({
                username,
                email,
                bio,
                name,
                password: hash
            });

            let token = jwt.sign({ username: username, userid: user._id }, "secret");

            res.cookie("token", token);

            res.redirect("profile");
        })
    })

})

app.get('/login', (req, res) => {
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


app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/");
})

// app.js
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel
            .findById(req.user.userid)
            .populate('posts');

        
        user.posts = user.posts || [];

        res.render('profile',{user:user});


    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching user profile');
    }
});


app.get('/home', isLoggedIn, async (req, res) => {
  try {

    const user = await userModel
            .findById(req.user.userid)
            .populate('posts');

    
    const posts = await postModel.find()
      .populate('user', 'username email')
      .sort({ date: -1 });

    

    // posts.forEach(function(p){
    //     res.json(p.id);
    // })

    // res.json(posts); // or res.render('home', { posts })
    res.render('home', {user:user, posts:posts} );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('/bio_edit/:id', isLoggedIn, async(req,res)=>{

    const user = await userModel
        .findById(req.user.userid);

     

    res.render('edit_bio',{user:user});
});

app.post('/bio_edit/bio_update/:id', isLoggedIn, async(req,res)=>{

    const user = await userModel.findByIdAndUpdate(
        req.params.id,
        { bio: req.body.newbio},
        { new: true}
    );
    res.redirect('/profile');

});


function isLoggedIn(req, res, next) {
    if (req.cookies.token === "") return res.redirect("/")
    else {
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data;
    }
    next();
}

app.get('/upload', (req, res) => {
    res.render('upload', { imagePath: null, caption: null, mood: null });
});

app.post('/upload', isLoggedIn, upload.single('image'), async (req, res) => {
    try {

        if(!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const { buffer, mimetype } = req.file;
        const { caption = '', mood = '' } = req.body;

        const newPost = await postModel.create({
            imageData: buffer,
            imageType: mimetype,
            caption,
            user: req.user.userid
        });

        const updatedUser = await userModel.findByIdAndUpdate(
            req.user.userid,
            { $push: { posts: newPost._id } },
            { new: true }
        );

        res.redirect('/profile');

    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading image');
    }
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
        let post = await postModel
            .findOne({_id:req.params.id}).populate("user");

        const user = await userModel
            .findById(req.user.userid).populate('posts');    

        console.log(post);

        if(post.likes.indexOf(req.user.userid) === -1){
            post.likes.push(req.user.userid);
        }else{
            post.likes.splice(post.likes.indexOf(req.user.userid),1);
        }

        await post.save();
        
        
        // res.redirect('/profile',{user:user, post:post});
        const backURL = req.get('Referer') || '/';
        res.redirect(backURL);

    
});

app.get('/profile_pic_edit/:id', isLoggedIn, (req, res) => {
    res.render('profile_pic_edit');
});

app.post('/profile_pic_edit/:id', isLoggedIn, upload.single('image'), async (req, res) => {
    try {

        if(!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const { buffer, mimetype } = req.file;
        const { caption = '', mood = '' } = req.body;

        // const newPost = await postModel.create({
        //     imageData: buffer,
        //     imageType: mimetype,
        //     caption,
        //     user: req.user.userid
        // });

        // const updatedUser = await userModel.findByIdAndUpdate(
        //     req.user.userid,
        //     { $push: { posts: newPost._id } },
        //     { new: true }
        // );

        res.redirect('/profile');

    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating profile');
    }
});




app.listen(3000, (req,res)=>{
    console.log("yes Runnig!")
});