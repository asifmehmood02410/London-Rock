import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary, deleteOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Product } from '../models/product.model.js';
import mongoose, { isValidObjectId } from 'mongoose';
import { cleanupTempFolder } from '../utils/emptyPublicTempFolder.js';
import { myCache } from '../app.js';
import invalidateCache from '../utils/invalidateCache.js';


const createProduct = asyncHandler(async (req, res) => {


    const { adtype, title, description, price, discount, propertyArea, landArea, livingRoom, bedRoom, bath, yearBuild, propertyType, propertyStatus, elevator, barbeque, airConditioning, laundry, wifi, other, otherFeatures, address, city } = req.body
    // console.log("req.body:", req.body)

    if (!['sale', 'rent'].includes(adtype)) {
        return res.status(409).json(
            new ApiError(409, null, 'Invalid adtype. Allowed values are "sale" or "rent"')
        );
    }

    //generat Property TD
    const objectId = new mongoose.Types.ObjectId();
    const lastFourDigits = objectId.toString().slice(-4);
    let propertyId;
    if (adtype === "sale") {
        propertyId = 'S' + lastFourDigits;
    }
    else {
        propertyId = 'R' + lastFourDigits;
    }

    const requiredFields = [adtype, title, description, price, livingRoom, bedRoom, bath, propertyType, propertyStatus, address, city];

    if (other === true) {
        if (otherFeatures === "") {
            return res.status(409).json(
                new ApiError(409, null, "Other Features Fields is required")
            );
        }
    }

    if (requiredFields.some(field => {
        if (typeof field === 'string') {
            return field.trim() === "";
        } else if (typeof field === 'number') {
            return field.toString().trim() === "";
        }
    })) {
        return res.status(409).json(
            new ApiError(409, null, "All Fields are required")
        );
    }

    // console.log("req.files?.images", req.files?.images);


    let uploadedImages = [];
    let thumbnailImage = [];

    const thumbnailLocalPath = req.files?.thumbnail[0].path;;

    if (!thumbnailLocalPath) {
        return res.status(409).json(
            new ApiError(409, null, "Please upload thumbnail"))
    }

    // console.log("thumbnailLocalPath", thumbnailLocalPath);
    const imagesLocalPath = req.files?.images;
    // console.log("req.files?.images", req.files?.images)
    if (!imagesLocalPath) {
        return res.status(409).json(
            new ApiError(409, null, "Please upload at least one image"))
    }

    // console.log("imagesLocalPath", imagesLocalPath);

    let userId = req.user?._id;
    if (!userId) {
        throw new ApiError(400, "Failed to get logged in User Id ")
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {


        // userId = new mongoose.Types.ObjectId(userId);


        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath).catch((error) =>
            res.status(500).json(
                new ApiError(500, null, `Cloudinary failed to upload thumbnail on cloud. catch error ${error}`)
            ))

        // console.log("thumbnail.public_id", thumbnail.public_id);
        thumbnailImage.push({
            public_id: thumbnail.public_id,
            url: thumbnail.secure_url
        });



        for (let index = 0; index < imagesLocalPath.length; index++) {
            const element = req.files?.images[index]?.path;
            // console.log("req.files?.images[index]?.path", req.files?.images[index]?.path)
            const imageDetails = await uploadOnCloudinary(element).catch((error) =>
                res.status(500).json(
                    new ApiError(500, null, `Cloudinary failed to upload images on cloud. catch error ${error}`)
                )
            );
            uploadedImages.push({
                public_id: imageDetails.public_id,
                url: imageDetails.secure_url
            });
        }



        // create user object - creat entry in db

        const product = await Product.create([{
            thumbnail: thumbnailImage,
            images: uploadedImages,

            adtype,
            propertyId,
            title,
            description,
            price,
            discount,
            propertyArea,
            landArea,
            livingRoom,
            bedRoom,
            bath,
            yearBuild,
            propertyType,
            propertyStatus,
            elevator,
            barbeque,
            airConditioning,
            laundry,
            wifi,
            other,
            otherFeatures,
            address,
            city,
            owner: userId

        }], { session: session })



        await invalidateCache({ product: true }) // when ever new product will created then clear the node cache

        // Commit the transaction if everything is successful
        await session.commitTransaction();
        session.endSession();

        // return response
        cleanupTempFolder() //clean the Public/temp folder

        return res.status(201).json(
            new ApiResponse(200, product, "Product Ad Created Successfully")
        )

    } catch (error) {
        // Rollback the transaction if any part fails

        //Delete the upload images on cloud in case of error

        if (thumbnailImage.length > 0) {
            for (let i = 0; i < thumbnailImage.length; i++) {
                const public_id = thumbnailImage[i].public_id
                const resource_type = "image"
                const deleteThumbnail = await deleteOnCloudinary(public_id, resource_type).catch((error) =>
                    res.status(500).json(
                        new ApiError(500, null, `Cloudinary failed to delete thumbnail on cloud. catch error ${error}`)
                    )
                );

            }
        }

        if (uploadedImages.length > 0) {
            for (let i = 0; i < uploadedImages.length; i++) {
                const public_id = uploadedImages[i].public_id
                const resource_type = "image"
                const deleteThumbnail = await deleteOnCloudinary(public_id, resource_type).catch((error) =>
                    res.status(500).json(
                        new ApiError(500, null, `Cloudinary failed to delete images on cloud. catch error ${error}`)
                    )
                );

            }
        }


        await session.abortTransaction();
        session.endSession();

        cleanupTempFolder() //clean the Public/temp folder


        return res.status(500).json(
            new ApiError(500, null, `Server failed to create new property ad into db. catch error 
            ${error}`)
        );


    }



});

const getAllProducts = asyncHandler(async (req, res) => {
    //in this api user will get all published products, it is accepting parameter (search base query)

    const { page = 1, adtype, query, minPrice, maxPrice, minRoom, maxRoom, propertyType, city } = req.query;

    try {
        const pipeline = [];
        if (query) {
            pipeline.push({
                $search: {
                    index: 'search-product',
                    text: {
                        query: query,
                        path: ["title", "description", "propertyId"] //search only on title, desc
                    }
                }
            })
        }

        if (adtype) {
            pipeline.push({
                $match: { adtype }
            })
        }

        if (propertyType) {
            pipeline.push({
                $match: { propertyType }
            })
        }

        if (minPrice) {
            pipeline.push(
                {
                    $match: {
                        price: { $gte: Number(minPrice) }
                    }
                }
            )
        }
        if (maxPrice) {
            pipeline.push(
                {
                    $match: {
                        price: { $lte: Number(maxPrice) }
                    }
                }
            )
        }
        if (minRoom) {
            pipeline.push(
                {
                    $match: {
                        bedRoom: { $gte: Number(minRoom) }
                    }
                }
            )
        }
        if (maxRoom) {
            pipeline.push(
                {
                    $match: {
                        bedRoom: { $lte: Number(maxRoom) }
                    }
                }
            )
        }

        if (city) {
            pipeline.push({
                $match: { city }
            })
        }


        // fetch products only that are set isPublished as true
        pipeline.push({ $match: { isPublished: true } });
        pipeline.push({ $sort: { createdAt: -1 } });

        const productAggregate = Product.aggregate(pipeline);

        const limit = process.env.PRODUCT_PER_PAGE;

        const options = {
            page: parseInt(page, 10), // parse page as base 10
            limit: parseInt(limit) // parse limit without specifying radix
        };
        const product = await Product.aggregatePaginate(productAggregate, options);


        return res
            .status(200)
            .json(new ApiResponse(200, product, "Products fetched successfully"));

    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to get all property ad from db. catch error ${error}`)
        );
    }




})

const getAllProductsByAdType = asyncHandler(async (req, res) => {
    //in this api user will get all published products, it is accepting parameter (search base query)

    const { adtype } = req.query;

    // console.log("adtype", adtype);

    if (adtype === "") {
        return res.status(409).json(
            new ApiError(409, null, 'ad Type can not be null / empty')
        );
    }

    try {

        const pipeline = [];



        if (adtype) {
            pipeline.push({
                $match: { adtype }
            })
        }

        // Fetch the latest 10 products
        pipeline.push(
            { $match: { isPublished: true } }, // Filter only published products
            { $sort: { createdAt: -1 } },      // Sort by createdAt in descending order
            { $limit: 10 }                      // Limit to 10 documents
        );


        const productAggregate = Product.aggregate(pipeline);
        let products;
        // const products = await productAggregate.exec(); // Execute the aggregation

        if (myCache.has(`product-${adtype}`)) {
            products = JSON.parse(myCache.get(`product-${adtype}`));
        }
        else {
            products = await productAggregate.exec();
            myCache.set(`product-${adtype}`, JSON.stringify(products))
        }

        return res
            .status(200)
            .json(new ApiResponse(200, products, "Products fetched by AD Type successfully"));

    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to get all property data by ad type from db. catch error ${error}`)
        );
    }

})

const getProductById = asyncHandler(async (req, res) => {

    const { productId } = req.params

    if (!(isValidObjectId(productId))) {
        return res.status(409).json(
            new ApiError(409, null, "Product Id is not valid")
        )
    }

    try {
        let singleProduct;

        if (myCache.has(`product-${productId}`)) {
            singleProduct = JSON.parse(myCache.get(`product-${productId}`));
        }
        else {
            singleProduct = await Product.findById(productId);
            myCache.set(`product-${productId}`, JSON.stringify(singleProduct))
        }

        if (!singleProduct) {
            return res.status(409).json(
                new ApiError(409, null, "Product not found in Database")
            )
        }

        return res
            .status(200)
            .json(new ApiResponse(200, singleProduct, "singleProduct fetched sucessfully."))

    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to get product by id from db. catch error ${error}`)
        );
    }




});

const updateProduct = asyncHandler(async (req, res) => {

    const { productId } = req.params

    // console.log("product id ", productId);
    //TODO: update product details like title, description, thumbnail

    const { adtype, title, description, price, discount, propertyArea, landArea, livingRoom, bedRoom, bath, yearBuild, propertyType, propertyStatus, elevator, barbeque, airConditioning, laundry, wifi, other, otherFeatures, address, city } = req.body
    // console.log("req.body:", req.body)

    if (!['sale', 'rent'].includes(adtype)) {
        return res.status(409).json(
            new ApiError(409, null, 'Invalid adtype. Allowed values are "sale" or "rent"')
        );
    }

    const requiredFields = [adtype, title, description, price, livingRoom, bedRoom, bath, propertyType, propertyStatus, address, city];



    if (other === true) {
        if (otherFeatures === "") {
            return res.status(409).json(
                new ApiError(409, null, "Other Features Fields is required")
            );
        }
    }

    if (requiredFields.some(field => {
        if (typeof field === 'string') {
            return field.trim() === "";
        } else if (typeof field === 'number') {
            return field.toString().trim() === "";
        }
    })) {
        return res.status(409).json(
            new ApiError(409, null, "All Fields are required")
        );
    }



    let userId = req.user?._id;
    if (!userId) {
        throw new ApiError(400, "Failed to get logged in User Id ")
    }

    if (!(isValidObjectId(productId))) {
        throw new ApiError(400, "Invalid Product identification")
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(400, "product not found")
    }

    if (product?.owner.toString() !== userId.toString()) {
        throw new ApiError(400, "Only product owner can update the product")
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // create user object - creat entry in db
        const updateProduct = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {

                    adtype,
                    title,
                    description,
                    price,
                    discount,
                    propertyArea,
                    landArea,
                    livingRoom,
                    bedRoom,
                    bath,
                    yearBuild,
                    propertyType,
                    propertyStatus,
                    elevator,
                    barbeque,
                    airConditioning,
                    laundry,
                    wifi,
                    other,
                    otherFeatures,
                    address,
                    city,

                }

            },
            { new: true },
            { session: session }
        );

        await invalidateCache({ product: true }) // when ever new product will created then clear the node cache

        // Commit the transaction if everything is successful
        await session.commitTransaction();
        session.endSession();


        return res.status(201).json(
            new ApiResponse(200, updateProduct, "Product Ad Updated Successfully")
        )

    } catch (error) {
        // Rollback the transaction if any part fails

        await session.abortTransaction();
        session.endSession();

        return res.status(500).json(
            new ApiError(500, null, `Server failed to update product. catch error ${error}`)
        );


    }

});

const updateThumbnail = asyncHandler(async (req, res) => {

    const { productId } = req.params
    //TODO: update video details like title, description, thumbnail


    if (!(isValidObjectId(productId))) {
        return res.status(409).json(
            new ApiError(409, null, 'Invalid productId identification')
        );

    }

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(409).json(
                new ApiError(409, null, 'Product not found from db')
            );
        }
        const userId = req.user?._id;

        if (product?.owner.toString() !== userId.toString()) {
            return res.status(409).json(
                new ApiError(409, null, 'Only product owner can update the thumbnail')
            );

        }

        const thumbnailLocalPath = req.file?.path;

        if (!thumbnailLocalPath) {
            return res.status(409).json(
                new ApiError(409, null, 'Thumbnail is required')
            );
        }

        // const thumbnailLocalPath = req.files?.thumbnail[0].path;

        // console.log("thumbnail path", thumbnailLocalPath);

        const oldThumbnailPublicId = product.thumbnail[0].public_id;
        const resource_type = "image"

        // console.log("oldThumbnailPublicId", oldThumbnailPublicId);

        const deleteThumbnail = await deleteOnCloudinary(oldThumbnailPublicId, resource_type).catch((error) =>
            res.status(500).json(
                new ApiError(500, null, `Cloudinary failed to delete old thumbnail during updation of thumbnail on cloud. catch error ${error}`)
            )
        )

        const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath).catch((error) =>
            res.status(500).json(
                new ApiError(500, null, `Cloudinary failed to update new thumbnail on cloud. catch error ${error}`)
            )
        )


        const updateThumbnail = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {

                    thumbnail: [{
                        url: newThumbnail.url,
                        public_id: newThumbnail.public_id
                    }]

                }

            },
            { new: true }
        );

        await invalidateCache({ product: true }) // when ever new product will created then clear the node cache

        if (!updateThumbnail) {
            return res.status(500).json(
                new ApiError(500, null, 'Update thumbnail failed')
            );

        }



        return res
            .status(200)
            .json(new ApiResponse(200, updateThumbnail, "Thumbnail updated successfully.."))
    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to update thumbnail. catch error ${error}`)
        );
    }



})

const updateImages = asyncHandler(async (req, res) => {

    const { productId } = req.params;
    const imageUrls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];

    // console.log("imageUrls", imageUrls);

    if (!(isValidObjectId(productId))) {
        return res.status(409).json(
            new ApiError(409, null, 'Invalid productId identification')
        );

    }

    const imagesLocalPath = req.files?.images;


    try {
        // Fetch the product from the database
        const product = await Product.findById(productId);

        const userId = req.user?._id;

        if (product?.owner.toString() !== userId.toString()) {
            return res.status(409).json(
                new ApiError(409, null, 'Only product owner can update the images')
            );

        }

        // Extract the existing image URLs from the database
        const existingImageUrls = product.images.map(image => image.url);

        // console.log("existingImageUrls", existingImageUrls);

        // Find URLs present in dbUrls but not in imageUrls. which images removed from frontend
        const imgRemovedFromFrontend = existingImageUrls.filter(url => !imageUrls.includes(url));



        // ***** Add the images which are added / not removed from frontend start *****


        // Initialize an array to store public_ids of already saved images 

        const publicIdsImageUrls = [];

        // Iterate over each URL in notInImageUrls and find the corresponding public_id
        imageUrls.forEach(url => {
            const image = product.images.find(image => image.url === url);
            if (image) {
                publicIdsImageUrls.push(
                    {
                        public_id: image.public_id,
                        url: image.url
                    }
                );
            }
        });

        // console.log('Public IDs not in imageUrls:', publicIdsNotInImageUrls);

        const uploadedImages = []

        if (imagesLocalPath) {
            // Upload the new images when user upadting the images
            for (let index = 0; index < imagesLocalPath.length; index++) {
                const element = req.files?.images[index]?.path;

                const imageDetails = await uploadOnCloudinary(element).catch((error) =>
                    res.status(500).json(
                        new ApiError(500, null, `Cloudinary failed to update images on cloud. catch error ${error}`)
                    )
                );
                uploadedImages.push({
                    public_id: imageDetails.public_id,
                    url: imageDetails.secure_url
                });
            }
        }


        const finalImages = [...publicIdsImageUrls, ...uploadedImages];

        // ***** Add the images which are added / not removed from frontend start *****


        // ***** delete the images which are remove from frontend start *****

        // Initialize an array to store public_ids
        const publicIdsImgRemovedFromFrontend = [];

        // Iterate over each URL in notInImageUrls and find the corresponding public_id
        imgRemovedFromFrontend.forEach(url => {
            const image = product.images.find(image => image.url === url);
            if (image) {
                publicIdsImgRemovedFromFrontend.push(image.public_id);
            }
        });

        if (publicIdsImgRemovedFromFrontend) {
            for (let i = 0; i < publicIdsImgRemovedFromFrontend.length; i++) {
                const public_id = publicIdsImgRemovedFromFrontend[i]
                const resource_type = "image"
                const deleteImages = await deleteOnCloudinary(public_id, resource_type)
                    .catch((error) =>
                        res.status(500).json(
                            new ApiError(500, null, `Cloudinary failed to delete old images during updation of images on cloud. catch error ${error}`)
                        )
                    );

            }
        }

        // ***** delete the images which are remove from frontend end *****




        const updateImages = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {

                    images: finalImages

                }

            },
            { new: true }
        );

        await invalidateCache({ product: true }) // when ever new product will created then clear the node cache

        if (!updateImages) {
            return res.status(500).json(
                new ApiError(500, null, 'Update Images failed ')
            );

        }

        await invalidateCache({ product: true }) // when ever new product will created then clear the node cache

        return res
            .status(200)
            .json(new ApiResponse(200, updateImages, "Images updated successfully.."))

    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to updated images. catch error ${error}`)
        );
    }

})


const deleteProductAd = asyncHandler(async (req, res) => {

    try {
        const { productId } = req.params;

        // console.log("productId", productId);

        if (!(isValidObjectId(productId))) {
            return res.status(400).json(
                new ApiError(400, "Invalide Product Identification")
            );

        }



        const product = await Product.findById(productId);
        if (!product) {
            return res.status(400).json(
                new ApiError(400, "Product Ad not Exist")
            );

        }

        // console.log("user on deletion ");

        const userId = req.user?._id;

        if (product?.owner.toString() !== userId.toString()) {
            throw new ApiError(400, "Only product owner can update the product")
            // return res.status(400).json(
            //     new ApiError(400, "Product Owner can delete the Product Ad")
            // );
        }






        const oldThumbnailPublicId = product.thumbnail[0].public_id;
        const thumbnail_Resource = "image"
        const deleteThumbnail = await deleteOnCloudinary(oldThumbnailPublicId, thumbnail_Resource).catch((error) =>
            res.status(500).json(
                new ApiError(500, null, `Cloudinary failed to delete thumbnail on cloud during deletion of product. catch error ${error}`)
            )
        );
        // if (!deleteThumbnail) {
        //     throw new ApiError(500, "Cloudinary failed to delete Thumbnail")
        // }

        const existingImagePublicIds = product.images.map(image => image.public_id);

        if (existingImagePublicIds.length > 0) {
            for (let i = 0; i < existingImagePublicIds.length; i++) {
                const public_id = existingImagePublicIds[i]
                const resource_type = "image"
                const deleteImages = await deleteOnCloudinary(public_id, resource_type)
                    .catch((error) =>
                        res.status(500).json(
                            new ApiError(500, null, `Cloudinary failed to delete old images on cloud. catch error ${error}`)
                        )
                    );

            }
        }

        const deleteProductAd = await Product.findByIdAndDelete(productId);

        await invalidateCache({ product: true }) // when ever new product will created then clear the node cache

        if (!deleteProductAd) {
            return res.status(500).json(
                new ApiError(500, " System Failed to delete Product Ad")
            );

        }


        return res
            .status(200)
            .json(new ApiResponse(200, deleteProductAd, "Product Ad Deleted successfully.."))



    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed to delete product from db. catch error ${error}`)
        );
    }

})


export {
    createProduct,
    getAllProducts,
    getAllProductsByAdType,
    getProductById,
    updateProduct,
    updateThumbnail,
    updateImages,
    deleteProductAd

}

