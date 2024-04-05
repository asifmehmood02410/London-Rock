import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const contactFormSchema = new Schema(
    {

        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        meeting_time: {
            type: String
        },

    },
    { timestamps: true });

contactFormSchema.plugin(mongooseAggregatePaginate)

export const Contact_Form = mongoose.model("Contact_Form", contactFormSchema);