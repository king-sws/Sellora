import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.SENDLER_USER as string, // Use env variable
        pass: process.env.EMAIL_PASSWORD as string, // Use env variable
    },
});

export default transporter;