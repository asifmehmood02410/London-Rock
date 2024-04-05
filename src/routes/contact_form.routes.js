import { Router } from "express";
import {
    addContactForm, getAllContactForm, deleteContactForm
} from "../controllers/contact_form.controller.js";

import { authUser } from "../middlewares/auth.middleware.js";

const router = Router();
// router.use(authUser); // Apply authUser middleware to all routes in this file


//  http://localhost:8000/api/v1/products


router
    .route("/")
    .get(authUser, getAllContactForm)
    .post(addContactForm);

router
    .route("/:contactId")
    .delete(authUser, deleteContactForm)


export default router

