import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Contact_Form } from '../models/contact_form.model.js';
import mongoose, { isValidObjectId } from 'mongoose';
import nodemailer from 'nodemailer'

// const nodemailer = require('nodemailer');

// Function to trim whitespace from both ends and the center of a string
function trimWhitespace(str) {
    return str.replace(/\s+/g, ' ').trim();
}

const addContactForm = asyncHandler(async (req, res) => {
    const { name, phone, email, message, meeting_time } = req.body

    // Trim string fields
    const trimmedName = trimWhitespace(name);
    const trimmedPhone = trimWhitespace(phone);
    const trimmedEmail = trimWhitespace(email);
    const trimmedMessage = trimWhitespace(message);

    // Check if any required fields are empty after trimming
    if ([trimmedName, trimmedPhone, trimmedEmail, trimmedMessage].some(field => field === "")) {
        return res.status(409).json(
            new ApiError(409, null, "All Fields are required")
        );
    }

    // Create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'outlook',

        // host: process.env.SMTP_HOST, // SMTP host (e.g., smtp.gmail.com)
        // port: process.env.SMTP_PORT, // SMTP port (e.g., 587 for TLS)
        // secure: false, // Set to true if your SMTP server requires a secure connection (TLS)
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // Setup email data with unicode symbols
    let mailOptions = {
        from: '<info@londonrockproperties.com>', // sender address
        to: process.env.SMTP_USERNAME, email, // list of receivers
        subject: 'New Contact Form Submission', // Subject line
        text: `Name: ${trimmedName}\nEmail: ${trimmedEmail}\nMessage: ${trimmedMessage}\nPhone # : ${trimmedPhone}\nMeeting Time : ${meeting_time}` // plain text body
    };

    // Send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        res.send('Email sent!');
    });
    // Creating a new contact form object with trimmed values
    const contactFormData = {
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        message: trimmedMessage,
        meeting_time
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const contactForm = await Contact_Form.create([contactFormData], { session: session })

        // Commit the transaction if everything is successful
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(
            new ApiResponse(200, contactForm, "Contact Form Submitted Successfully")
        )

    } catch (error) {

        await session.abortTransaction();
        session.endSession();
        // console.log("error", error)
        return res.status(500).json(
            new ApiError(500, null, `Server failed to save contact form data into db. catch error ${error}`)
        );
    }

});

const getAllContactForm = asyncHandler(async (req, res) => {
    //in this api user will get all published products, it is accepting parameter (search base query)

    const { page = 1 } = req.query;

    // console.log("query", query);
    try {
        const pipeline = [];

        pipeline.push({ $sort: { createdAt: -1 } });

        const contactAggr = Contact_Form.aggregate(pipeline);

        // const page = Number(req.query.page) || 1;
        const limit = process.env.CONTACT_FORM_PER_PAGE;

        const options = {
            page: parseInt(page, 10), // parse page as base 10
            limit: parseInt(limit) // parse limit without specifying radix
        };
        const contacts = await Contact_Form.aggregatePaginate(contactAggr, options);


        return res
            .status(200)
            .json(new ApiResponse(200, contacts, "contacts fetched successfully"));

    } catch (error) {
        return res.status(500).json(
            new ApiError(500, null, `Server failed get all contact form data. catch error ${error}`)
        );
    }

})

const deleteContactForm = asyncHandler(async (req, res) => {

    try {
        const { contactId } = req.params;



        if (!(isValidObjectId(contactId))) {
            return res.status(400).json(
                new ApiError(400, "Invalide contactId Identification")
            );
        }

        const contact = await Contact_Form.findById(contactId);
        if (!contact) {
            return res.status(400).json(
                new ApiError(400, "contact form not Exist")
            );

        }

        const deleteContactForm = await Contact_Form.findByIdAndDelete(contactId);

        if (!deleteContactForm) {
            return res.status(500).json(
                new ApiError(500, " System Failed to delete Contact Form")
            );
        }

        return res
            .status(200)
            .json(new ApiResponse(200, deleteContactForm, "Contact Form Deleted successfully.."))

    } catch (error) {

        return res.status(500).json(
            new ApiError(500, null, `Server failed to delte contact form data into db. catch error ${error}`)
        );
    }

})




export {
    addContactForm,
    getAllContactForm,
    deleteContactForm,


}