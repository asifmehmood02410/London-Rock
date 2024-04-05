import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary, deleteOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';


const registerUser = asyncHandler(async (req, res) => {


    const { fullname, username, password } = req.body

    if (
        [fullname, username, password].some((field) => field?.trim() === "")
    ) {
        return res.status(409).json(
            new ApiError(409, null, "All Fields are required")
        )

    }

    // check if user already exists: username, email

    const existingUser = await User.findOne({
        $or: [{ username }]
    })

    if (existingUser) {
        return res.status(409).json(
            new ApiError(409, null, "User with username already exist")
        )

    }

    // check for image , check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        return res.status(409).json(
            new ApiError(409, null, "Avatar field is required")
        )

    }

    const avatar = await uploadOnCloudinary(avatarLocalPath).catch((error) =>
        res.status(500).json(
            new ApiError(500, null, `Avatar failed to upload on cloud. catch error ${error}`)
        )
    )

    // validatation for avatar
    if (!avatar) {
        return res.status(409).json(
            new ApiError(409, null, "Avatar field is required")
        )
    }

    // create user object - creat entry in db

    try {
        const user = await User.create({
            fullname,
            avatar: {
                public_id: avatar.public_id,
                url: avatar.secure_url
            },
            password,
            username
        })

        //Check if Field added into the mongo DB. when ever field add into the Monogo Db first time it auto create _id field in the created table which is uniqu.

        // .select method use to remove or unselect fields from the user object. -password and -refreshTokens field will not select all other will selected and ready to insert field in the Database

        // remove password and refresh token field from response

        const createUser = await User.findById(user._id).select(
            "-password"
        )

        // chehc for user creation


        if (!createUser) {
            return res.status(500).json(
                new ApiError(500, null, "Some thing went wrong while registering a user")
            )

        }

        // return response

        return res.status(201).json(
            new ApiResponse(200, createUser, "User Registered Successfully")
        )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to save new user data into db. catch error ${error}`)
        );
    }
});


const loginUser = asyncHandler(async (req, res) => {

    const { username, password } = req.body

    if (!(username || password)) {
        return res.status(400).json(
            new ApiError(400, null, "username and password is required")
        )
    }

    try {
        //findone return first data which found
        const userData = await User.findOne({
            $or: [{ username }]
        })


        if (!userData) {
            return res.status(400).json(
                new ApiError(400, null, "Username does not exist")
            )
        }

        const isPasswordValid = await userData.isPasswordCorrect(password);

        if (!isPasswordValid) {
            return res.status(400).json(
                new ApiError(400, null, "Invalid Password")
            )
        }


        //in this query we selecting all fields from database except password and refreshtoken
        const loggedInUser = await User.findById(userData?._id).select("-password")

        req.session.userId = userData?._id;

        // Set expiration time for the session cookie (e.g., 1 hour)
        req.session.cookie.maxAge = 3600000; // 1 hour in milliseconds

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    // { user: loggedInUser, accessToken, refreshToken },
                    loggedInUser,
                    "User logged in Successfully"
                )
            )
    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to login the user. catch error ${error}`)
        );
    }

});

const logoutUser = asyncHandler(async (req, res) => {

    try {
        req.session.destroy(err => {
            if (err) {

                return res.status(500).json(
                    new ApiError(500, null, "Logout failed")
                )
            } else {

                res.clearCookie('connect.sid');

                return res
                    .status(200)
                    .json(
                        new ApiResponse(200, {}, "User Logged Out")
                    )

            }
        });
    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to logout user. catch error ${error}`)
        );
    }

});


const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); //return true or false

    if (!isPasswordCorrect) {
        return res.status(400).json(
            new ApiError(400, null, "Invalid Old Password")
        )
    }

    //set new password on user table field password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false }) //when save command run pre method in my user.model.js will run
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password change successfully."))


});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched."))


});



export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,

}
