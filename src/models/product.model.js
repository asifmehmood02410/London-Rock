import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const productSchema = new Schema(
    {
        adtype: {
            type: String,
            enum: ['sale', 'rent'], // Define the allowed options
            required: true
        },
        propertyId: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            default: 0,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        propertyArea: {
            type: Number,
            default: 0
        },
        landArea: {
            type: Number,
            default: 0
        },
        livingRoom: {
            type: Number,
            default: 0,
            required: true
        },
        bedRoom: {
            type: Number,
            default: 0,
            required: true
        },
        bath: {
            type: Number,
            default: 0
        },
        yearBuild: {
            type: String,
            maxlength: 4
        },
        propertyType: {
            type: String,
            required: true
        },
        propertyStatus: {
            type: String,
            required: true
        },
        thumbnail: [
            {
                url: {
                    type: String,
                    required: true
                },
                public_id: {
                    type: String,
                    required: true
                }
            }
        ],
        images: [
            {
                url: {
                    type: String,
                    required: true
                },
                public_id: {
                    type: String,
                    required: true
                }
            }
        ],
        elevator: {
            type: Boolean,
            default: false
        },
        barbeque: {
            type: Boolean,
            default: false
        },
        airConditioning: {
            type: Boolean,
            default: false
        },
        laundry: {
            type: Boolean,
            default: false
        },
        wifi: {
            type: Boolean,
            default: false
        },
        other: {
            type: Boolean,
            default: false
        },
        otherFeatures: {
            type: String
        },

        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            //passing foreign key
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    },
    { timestamps: true });

productSchema.plugin(mongooseAggregatePaginate)

export const Product = mongoose.model("Product", productSchema);