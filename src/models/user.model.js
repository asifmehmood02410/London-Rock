import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt';

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: [true, 'username is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        // email: {
        //     type: String,
        //     required: [true, 'email is required'],
        //     unique: true,
        //     lowercase: true,
        //     trim: true,
        // },
        fullname: {
            type: String,
            required: [true, 'fullname is required'],
            trim: true,
            index: true
        },
        avatar: {
            type: {
                public_id: String,
                url: String //cloudinary url
            },
            required: true
        },

        role: {
            type: String,
            default: 'admin'

        },

        password: {
            type: String,
            required: [true, 'Password is required']
        },

    },
    {
        timestamps: true
    }
);

//pre is hook of mongoose. We use pre if we perform any operation on data before any operation like save, update, delete etc... we should not use arrow function in pre hook.

userSchema.pre("save", async function (next) {

    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()

    // OR

    // if (this.isModified("password")) {
    //     this.password = bcrypt.hash(this.password, 10)
    // }else{
    //     next()
    // }

})

//In mongoose we can also create our methods. Now i am creating method to compare user input password and encrypted password is same. name of my created method is "isPasswordCorrect"

userSchema.methods.isPasswordCorrect = async function (password) {
    // bcrypt.compare method return result in Boolean. password is user input and this.password is encrypted password
    return await bcrypt.compare(password, this.password)
}

export const User = mongoose.model("User", userSchema);