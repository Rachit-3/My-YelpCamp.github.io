const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsmate = require('ejs-mate');
const methodOverride = require('method-override');
const Joi = require('joi');
const Campground = require('./models/campground');
const catchAsync = require('./Utilities/catchAsync');
const ExpressError = require('./Utilities/ExpressError');
const Review= require('./models/review');
mongoose.connect('mongodb://localhost:27017/yelp-camp');

const db = mongoose.connection;
db.on('error', console.error.bind(console, "connection error:"));
db.once('open', () => {
    console.log("open connection");
});


const app = express();

app.engine('ejs', ejsmate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));


// app.get('/makeCampground',async (req, res)=> {
//    const camp=new Campground({title: 'Campaign'});
//    await camp.save();
//     // res.render('home')
//     res.send(camp)
// });
const validCamp=(req, res, next) => {
    const campgroundSchema = Joi.object({
        campground: Joi.object({
            title: Joi.string().required(),
            price: Joi.number().required().min(0),
            images: Joi.string().required(),
            location: Joi.string().required(),
            description: Joi.string().required()
        }).required()
    })
  

    const {error} = campgroundSchema.validate(req.body);
    // console.log(result);
    if (error) {
        const msg= error.details.map(er=>er.message).join(',');
        throw new ExpressError(msg, 400);
    }
else 
{
    next();
}

}
const validReview=(req,res,next) => {
const reviewSchema=Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        body: Joi.string().required()
    }).required()
})
const {error} = reviewSchema.validate(req.body);
// console.log(result);
if (error) {
    const msg= error.details.map(er=>er.message).join(',');
    throw new ExpressError(msg, 400);
}
else 
{
next();
}
}
app.get('/', (req, res) => {
    console.log('hi on  server  ');
    res.render('home')
});

app.get('/campgrounds', async (req, res) => {
    // console.log('hi on  server  ');
    const campgrounds = await Campground.find({});
    res.render('Campgrounds/allCamp', { campgrounds })
});

app.get('/campgrounds/new', (req, res) => {
    res.render('Campgrounds/newCamp')
});
app.post('/campgrounds',validCamp, catchAsync(async (req, res, next) => {
   
    const campground = new Campground(req.body.campground);
    // console.log(campground[title]);
    await campground.save();
    res.redirect(`Campgrounds/${campground._id}`);

}))

app.get('/campgrounds/:id', catchAsync(async (req, res) => {
    const id = req.params.id;
    const campgrounds = await Campground.findById(id).populate('reviews');
    console.log(campgrounds);
    // console.log(campgrounds);
    res.render('Campgrounds/details', { campgrounds })
}));

app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    const id = req.params.id;
    const campgrounds = await Campground.findById(id);
    res.render('Campgrounds/edit', { campgrounds });
}))
app.put('/campgrounds/:id',validCamp, catchAsync(async (req, res) => {
    // res.send('Campgrounds is Working');
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    // Campground.findByIdAndUpdate
    res.redirect(`/Campgrounds/${campground.id}`);
}))

app.delete('/campgrounds/:id', catchAsync(async (req, res) =>{
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect('/campgrounds');

}));
app.post('/campgrounds/:id/reviews',validReview,catchAsync(async (req, res) =>
{
    const campground =await Campground.findById(req.params.id);
    const  review = new Review(req.body.review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
}))
app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) =>{
    const{id, reviewId}=req.params;
    await Campground.findByIdAndUpdate(id,{$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/campgrounds/${id}`);
    
}))
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
})
app.use((err, req, res, next) => {
    // {    const {statusCode=500,message="SomThing went wrong "} = err;
    //    res.status(statusCode).send(message)
    if (!err.message) err.message = "Problem Occurs Man"
    res.render('Error', { err })
    next();
})
app.listen(3000, () => {
    console.log('listening on port 3000');
});