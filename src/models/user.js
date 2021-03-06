const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require ('bcrypt')
const jwt = require('jsonwebtoken')
const Task = require('./task')
require('dotenv').config()

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type:String,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        trim: true ,
        minLength: 7,
        validate (value) {
            if (value.toLowerCase().includes('password') === true){
                throw new Error ('Password can not contain the word "password"')
            }
        }
    },
    email:{
        type: String,
        unique:true,
        required: true,
        trim: true,
        lowerCase: true,
        validate (value) {
            if (!validator.isEmail(value)){
                throw new Error ('Enter a valid email.')
            }
        }
    },
    avatar: {
        type: Buffer
    },
    age: {
        type: Number ,
        default: 0 ,
        validate (value) {
            if (value < 0) {
                throw new Error ('Age must be positive')
            }
        }
    } , 
    tokens: [{
        token:{
            type: String ,
            required: true
        }
    }] 
} , {
    timestamps: true
})

// virtual tasks property that will hold the tasks created by each user
// it's the same as joining two tables to get all tasks created by a user
userSchema.virtual('tasks' , {
    ref: 'Task',
    localField: '_id',
    foreignField: 'creator'
})

// generating an auth token to each individual user
userSchema.methods.generateAuthToken = async function () {
    const user = this 
    const token = jwt.sign({ id : user._id.toString() } , process.env.JWT_SECRET)

    user.tokens = user.tokens.concat({token})

    await user.save()
    return token
}

// getting public user data
userSchema.methods.getPublicUser = function () {
    const user = this 
    return {
        name : user.name ,
        email: user.email ,
        age: user.age,
        _id: user._id,
        createdAt:user.createdAt,
        updatedAt:user.updatedAt
    }
}


// customizing our own function on the User model to authenticate a user 
userSchema.statics.findByCredetials = async (email,password) => {
    const user = await User.findOne({ email })
    if (!user){
        throw new Error ("Unable to login")
    }
    const validLogin = await bcrypt.compare(password,user.password)  
    if (!validLogin){
        throw new Error ("Email or password is incorrect")
    } 
    return user
}

// Hash any password before saving it 
userSchema.pre('save' , async function (next) {
    const user = this 
    // checking if the password property on user is being changed(created or updated) then we want to hash it
    if (user.isModified('password')) {
            user.password = await bcrypt.hash(user.password,8)
    }
    next()
})

// Delete all user tasks when user is removed
userSchema.pre('remove' , async function (next) {
    const user = this 
    await Task.deleteMany({creator: user._id})
    next()
})

// creating user model 
const User = mongoose.model('User',userSchema)

module.exports = User
