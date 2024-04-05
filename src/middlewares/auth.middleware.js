import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// This middleware is used to authonticate the user, i will use it when i will logout the user first i will call this middleware in routes to authonticate the user by decoding the accessToken and then logout the user.
// i create this middleware for the reusablity were ever i need to logout user to like update the blogs, article any thing i need to access the User table in the database this method is giving me access to the database authontic user.


// if we are not using res in my code like below code we can replace res with "_" 
export const authUser = asyncHandler(async (req, _, next) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return next(new ApiError(400, "Unauthorized Request"));
        }

        const user = await User.findById(userId).select("-password");

        if (!user) {
            return next(new ApiError(400, "Invalid User Session Id"));
        }

        req.user = user;
        next();
    } catch (error) {
        next(new ApiError(400, error?.message, "Invalid User Session Id"));
    }
});