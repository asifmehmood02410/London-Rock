import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { unlinkSync } from 'fs';
import { ApiError } from './ApiError.js';
import { cleanupTempFolder } from './emptyPublicTempFolder.js';

//fs stands for File System it is built in node js. it allow us to perform all operations with file read/write/update/delete etc

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {

    try {

        if (!localFilePath) return null;

        // console.log("localFilePath", localFilePath);

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,
            {
                folder: 'london-rock-imgs',
                resource_type: 'auto'
            }
        )
        return response;
    } catch (error) {

        throw new ApiError(500, "Cloudinary failed to upload file", error)
    }
}

const deleteOnCloudinary = async (public_id, resourceType) => {
    try {

        if (!public_id) return null;

        const response = await cloudinary.uploader.destroy(public_id, {
            folder: 'london-rock-imgs',
            resource_type: resourceType
        })

        return response;

    } catch (error) {
        throw new ApiError(500, "Cloudinary failed to delete file", error)
    }
}


export { uploadOnCloudinary, deleteOnCloudinary }