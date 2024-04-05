import multer from "multer";
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 from the uuid package


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log("Multer file", file)
        cb(null, "./Public/temp")

    },
    filename: function (req, file, cb) {
        // console.log("Multer file", file)

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = file.originalname.split('.').pop();
        cb(null, `${uuidv4()}-${uniqueSuffix}.${fileExtension}`);


    }
})

export const upload = multer({ storage: storage })

