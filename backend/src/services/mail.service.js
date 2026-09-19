const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: process.env.MAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD
            }
        });
    }
    return transporter;
}

async function sendMail({ to, subject, html }) {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
        console.warn(`[mail] MAIL_USER/MAIL_PASSWORD not set — skipping email to ${to}: "${subject}"`);
        return;
    }
    await getTransporter().sendMail({
        from: `"ZomaFeeds" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html
    });
}

async function sendOtpEmail(email, otp, purpose) {
    const action = purpose === 'login' ? 'log in to' : 'create';
    await sendMail({
        to: email,
        subject: `${otp} is your ZomaFeeds verification code`,
        html: `
            <p>Use this code to ${action} your ZomaFeeds account:</p>
            <h2 style="letter-spacing:6px">${otp}</h2>
            <p>This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
        `
    });
}

async function sendWelcomeEmail(email, name) {
    await sendMail({
        to: email,
        subject: 'Your ZomaFeeds account was created successfully',
        html: `
            <p>Hi ${name || 'there'},</p>
            <p>Your account has been created successfully. Welcome to ZomaFeeds!</p>
        `
    });
}

async function sendOrderBillEmail(email, order) {
    const foodName = order.food?.name || 'Food item';
    const restaurantName = order.food?.foodPartner?.name || 'The restaurant';
    await sendMail({
        to: email,
        subject: `Order confirmed — your ZomaFeeds bill (#${order._id})`,
        html: `
            <h2>Your order is confirmed!</h2>
            <p>${restaurantName} has accepted your order and started preparing it.</p>
            <table style="border-collapse:collapse;width:100%;max-width:420px">
                <tr><td style="padding:6px 0">Item</td><td style="padding:6px 0;text-align:right">${foodName}</td></tr>
                <tr><td style="padding:6px 0">Quantity</td><td style="padding:6px 0;text-align:right">${order.quantity}</td></tr>
                <tr><td style="padding:6px 0">Payment method</td><td style="padding:6px 0;text-align:right">${(order.paymentMethod || '').toUpperCase()}</td></tr>
                <tr><td style="padding:6px 0">Payment status</td><td style="padding:6px 0;text-align:right;text-transform:capitalize">${order.paymentStatus}</td></tr>
                <tr><td style="padding:10px 0;font-weight:bold;border-top:1px solid #ddd">Total</td><td style="padding:10px 0;text-align:right;font-weight:bold;border-top:1px solid #ddd">₹${order.total}</td></tr>
            </table>
            <p>Delivery address: ${order.address}</p>
            <p style="color:#888;font-size:12px">This is a dummy checkout — no real payment was charged.</p>
        `
    });
}

module.exports = { sendOtpEmail, sendWelcomeEmail, sendOrderBillEmail };
