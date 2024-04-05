import { Router } from "express";
import {
    createProduct, getAllProducts, getAllProductsByAdType,
    getProductById, updateProduct,
    updateThumbnail, updateImages, deleteProductAd
} from "../controllers/product.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { authUser } from "../middlewares/auth.middleware.js";

const router = Router();
// router.use(authUser); // Apply authUser middleware to all routes in this file


//  http://localhost:8000/api/v1/products


router
    .route("/")
    .get(getAllProducts)
    .post(authUser,
        upload.fields([
            {
                name: "thumbnail",
                maxCount: 1,
            },
            {
                name: "images",
                maxCount: 14,
            },

        ]),

        createProduct
    );


router.route("/product_by_adType").get(getAllProductsByAdType)

router
    .route("/:productId")
    .get(getProductById)
    .delete(authUser, deleteProductAd)

router.route("/update_product_detail/:productId").patch(authUser, updateProduct);

router.route("/update_thumbnail/:productId").patch(authUser, upload.single("thumbnail"), updateThumbnail);

router.route("/update_images/:productId").patch(authUser,
    upload.fields([

        {
            name: "images",
            maxCount: 14,
        },

    ])
    , updateImages);




export default router

