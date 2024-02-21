import asyncHandler from 'express-async-handler';
import {User} from '../models/user.model.js';
import {ApiError} from '../utils/ApiError.js';
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken";

// generate access and refresh tokens
const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        if(!user){
            throw new ApiError(404, "User not found")
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        console.error('Error generating tokens:', error);
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

// register user controller
const registerUser = asyncHandler(async(req, res)=>{

    // get user details
    const {fullname, email, username, password} = req.body;

    // validation if user entered details or not 
    // method 1
    // if (!fullName || !email || !username || !password){
    //     throw new ApiError(400, "All fields are required")
    // }
    //method 2 
    if([fullname, email, username, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required")
    }

    // check if usr already exists - username and email
    const ifExist = await User.findOne({
        $or: [{username}, {email}]
    })
    if(ifExist){
        throw new ApiError(406,"User is already exists")
    }
    // console.log(req.files);

    // check for images and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Please add avatar")
    }
    // console.log(avatarLocalPath, coverImageLocalPath);

    // upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400, "Avatar is not able to upload")
    }

    // create user object - create entry in DB
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username,
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
const loginUser = asyncHandler(async(req, res)=>{
    // get data from body 
    const {username, email, password} = req.body;

    // username or email
    if(!username && !email){
        throw new ApiError(400, "Username or Email is required")
    }

    // find the user
    const user = await User.findOne({
        $or : [{username}, {email}] // mongo quiery for OR operator
    })
    if(!user){
        throw new ApiError(400, "User not exist, Please check username and password")
    }

    // check the password
    const checkPass = await user.isPasswordCorrect(password);
    if(!checkPass){
        throw new ApiError(401, "Password is incorrect")
    }

    // access and refresh token 
    try {
        const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
        // send cookie 
        const options = {
            httpOnly: true,
            secure: true
        }
        return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged in sucessfully",
                
            )
        )
    } catch (error) {
        console.error('Error generating tokens:', error);
        throw new ApiError(500, 'Token generation failed');
    }
    
})

// Logout user 
const logoutUser = asyncHandler (async(req, res)=>{
    
    // quiery to clear refresh token
    // method 1
    // await User.findByIdAndUpdate(
    //     req.user._id,
    //     {
    //         $set: {
    //             refreshToken: undefined
    //         }
    //     }
    // )
    
    // method 2
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: '',
            },
        }
    );
    

    // for clearing cookie
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out sucessfully"))
})

// refresh Access token 
const refreshAccessToken = asyncHandler( async(req, res)=> {
    // request refresh token from cookies
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        // quiery to get userInfo from the decoded Token's _id
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

// change password  
const changeCurrentPassword = asyncHandler(async(req, res)=>{
    // get data from body 
    const {oldPassword, newPassword} = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Both oldPassword and newPassword are required");
    }

    // get user data 
    const user = await User.findById(req.user?._id);
    
    // check if password is correct
    const checkPass = await user.isPasswordCorrect(oldPassword);
    if(!checkPass){
        throw new ApiError(401, "Password is incorrect")
    }

    // // set new password 
    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    // returning response
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})

// current user 
const getCurrentUser = asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        )
    )
})

// update account details...
const updateAccountDetails = asyncHandler(async(req, res)=> {
    
    // get data from the body 
    const {fullname, email} = req.body;

    if(!fullname || !email){
        throw new ApiError(401, "All fields are required");
    }

    // update user 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        }
    ).select("-password")
    if(!user){
        throw new ApiError(401, "Something went wrong while updating")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})

// update avatar 
const updateUserAvatar = asyncHandler(async(req, res)=> {

    // get avatar file
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(401, "Avatar file is mising")
    }

    // upload file 
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(401, "Error while uploading avatar")
    }

    // update field 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")
    if(!user){
        throw new ApiError(401, "Avatar is not updated")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

// update user cover image 
const updateUserCoverIamge = asyncHandler(async(req, res)=> {

    // get avatar file
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(401, "cover iamge file is mising")
    }

    // upload file 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(401, "Error while uploading Cover image")
    }

    // update field 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    if(!user){
        throw new ApiError(401, "Cover image is not updated")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

// get user channel profile 
const getUserChannelProfile = asyncHandler(async(req, res) => {

    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },{
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },{
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(400, "channe; doesn't exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(201, channel[0], "User channel fetched successfully")
    )
})

// delete user...

export {
    registerUser, 
    loginUser,
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar, 
    updateUserCoverIamge,
    getUserChannelProfile
};
