import asyncHandler from 'express-async-handler';
import {User} from '../models/user.model.js';
import {ApiError} from '../utils/ApiError.js';
import {updoadOnCloudinary} from "../utils/cloudinary.js";
import { upload } from '../middlewares/multer.middleware.js';
import {ApiResponse} from '../utils/ApiResponse.js';

// register user controller
const registerUser = asyncHandler(async(req, res)=>{

    // get user details
    const {fullName, email, username, password} = req.body;

    // validation if user entered details or not 
    // method 1
    // if (!fullName || !email || !username || !password){
    //     throw new ApiError(400, "All fields are required")
    // }
    //method 2 
    if([fullName, email, username, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    // check if usr already exists - username and email
    const ifExist = await User.findOne({
        for: [{username}, {email}]
    })
    if(ifExist){
        throw new ApiError(406,"User is already exists")
    }

    // check for images and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverIamge[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Please add avatar")
    }

    // upload them to cloudinary
    const avatar = await updoadOnCloudinary(avatarLocalPath);
    const coverImage = await updoadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400, "Please add avatar")
    }

    // create user object - create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    // check for user creation and remove password and refresh token from the response
    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken" // -<field name> is used to make filed not to be selected
    )
    if(!userCreated){
        throw new ApiError(500, "Something went while registering the user")
    }
    
    // return response
    return res.status(201).json(
        new ApiResponse(200, userCreated, "User registered sucessfully")
    )
})

// login user controller 

// check user if logged in or not...

// update user details...

// delete user...

export {registerUser};