import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser

} from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { authUser } from "../middlewares/auth.middleware.js";

const router = Router();

//  http://localhost:8000/api/v1/users/register

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }

    ]),
    registerUser);

router.route("/login").post(loginUser);

//secured routes

router.route("/logout").post(authUser, logoutUser);

router.route("/change-password").post(authUser, changeCurrentPassword)

router.route("/current-user").get(authUser, getCurrentUser)


export default router

