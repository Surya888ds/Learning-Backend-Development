import { asynHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { response } from "express";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user= await User.findById(userId)
        const accessToken= user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()

        user.refreshToken= refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")    
    }
}

const registerUser = asynHandler(async (req,res) => {

    res.status(200).json({
        message: "OK"
    })

    // get user details from frontend
    const {fullName, email, username, password} = req.body
    // validation - not empty

    if(
        [fullName, email, username, password].some((field) => 
        field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are compulsory")
    }
    // if(fullName===""){
    //     throw new ApiError(
    //         400,
    //         "fullname is required"
    //     )
    // }

    // check if use already exits: username, email
    const existedUser=await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username exists")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // upload them to cloudinary
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
    // create user object- create entry in db
    const user= await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    

    
    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // check for use creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    // return res

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")

    )

})

const loginUser = asynHandler(async (req,res) =>{
    // req body -> data
    const {email, username, password} = req.body
    if(!username || !email){
        throw new ApiError(400, "usename or email is required")
    }
    // username or email
    const user = await User.findOne({
        $or: [{username}, {email}]
    })


    // find the user
    if(!user){
        throw new ApiError(404, "user not found")
    }

    // password check

    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }
    // access and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    const logedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: logedInUser, accessToken, 
                refreshToken
            },
            "User logged in successfully"
        )
    )
    
})

// logout
const logoutUser = asynHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}