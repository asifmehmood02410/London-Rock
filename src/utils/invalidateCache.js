import { myCache } from "../app.js";
import { Product } from "../models/product.model.js";

const invalidateCache = async (product) => {

    try {
        if (product) {
            const productKey = [];
            const products = await Product.find({}).select("_id");
            products.forEach(i => {
                productKey.push(`product-${i._id}`)
                // productKey.push(`product-${i.adtype}`)
            })

            productKey.push(`product-rent`)
            productKey.push(`product-sale`)


            // console.log("product key", productKey);

            myCache.del(productKey)
        }

    } catch (error) {


        console.log("Error occured in method invalidateCache:", error)

    }


}

export default invalidateCache