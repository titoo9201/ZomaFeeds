const axios = require('axios');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const BRAND_GRADIENT = 'linear-gradient(135deg, #F56A4C, #E23744, #C13584, #833AB4)';
const TEXT_MAIN = '#201113';
const TEXT_MUTED = '#5E4548';
const SURFACE_MUTED = '#FBEAE6';

function renderShell({ preheader = '', heading, bodyHtml }) {
    return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E9E6;padding:32px 16px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td align="center">
            <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(32,17,19,.08);">
                <tr><td style="background:${BRAND_GRADIENT};padding:28px 24px;text-align:center;">
                    <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-.5px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">🍽 ZomaFeeds</span>
                </td></tr>
                <tr><td style="padding:32px 28px;">
                    ${heading ? `<h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:${TEXT_MAIN};">${heading}</h1>` : ''}
                    ${bodyHtml}
                </td></tr>
                <tr><td style="padding:20px 28px;background:${SURFACE_MUTED};text-align:center;">
                    <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">Food discovery, one reel at a time. Watch it, crave it, order it.</p>
                    <p style="margin:6px 0 0;font-size:11px;color:${TEXT_MUTED};">This is an automated message from ZomaFeeds — please don't reply to this email.</p>
                </td></tr>
            </table>
        </td></tr>
    </table>`;
}

const paragraph = text => `<p style="margin:0 0 16px;color:${TEXT_MUTED};font-size:15px;line-height:1.6;">${text}</p>`;

async function sendMail({ to, subject, html }) {
    if (!process.env.BREVO_API_KEY || !process.env.MAIL_USER) {
        console.warn(`[mail] BREVO_API_KEY/MAIL_USER not set — skipping email to ${to}: "${subject}"`);
        return;
    }
    await axios.post(BREVO_API_URL, {
        sender: { name: 'ZomaFeeds', email: process.env.MAIL_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html
    }, {
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': process.env.BREVO_API_KEY
        },
        timeout: 15000
    });
}

async function sendOtpEmail(email, otp, purpose) {
    const action = purpose === 'login' ? 'log in to' : 'create';
    const bodyHtml = `
        ${paragraph(`Use the code below to ${action} your ZomaFeeds account. It expires in 5 minutes.`)}
        <div style="text-align:center;margin:8px 0 24px;">
            <span style="display:inline-block;padding:14px 26px;border-radius:12px;background:${SURFACE_MUTED};font-size:32px;font-weight:800;letter-spacing:10px;color:#E23744;">${otp}</span>
        </div>
        <p style="margin:0;color:#8A6B6E;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    `;
    await sendMail({
        to: email,
        subject: `${otp} is your ZomaFeeds verification code`,
        html: renderShell({ preheader: `Your ZomaFeeds code is ${otp}`, heading: "Verify it's you", bodyHtml })
    });
}

async function sendWelcomeEmail(email, name) {
    const firstName = name?.trim()?.split(' ')[0] || 'there';
    const bodyHtml = `
        ${paragraph(`Hi ${name || 'there'},`)}
        ${paragraph('Your ZomaFeeds account is ready. Scroll bite-sized food reels, discover restaurants near you, and order in a tap.')}
        ${paragraph('We\'re glad you\'re here — happy eating! 🍽️')}
    `;
    await sendMail({
        to: email,
        subject: 'Your ZomaFeeds account was created successfully',
        html: renderShell({ preheader: 'Welcome to ZomaFeeds', heading: `Welcome, ${firstName}! 🎉`, bodyHtml })
    });
}

function billTable(order) {
    const itemLines = (order.items || []).map(item => `${item.food?.name || 'Item'} × ${item.quantity}`).join('<br/>') || 'Food item';
    const b = order.billBreakdown || {};
    const itemsTotal = b.itemsTotal ?? order.total;
    const row = (label, value) => `<tr><td style="padding:8px 0;color:${TEXT_MUTED};font-size:14px;">${label}</td><td style="padding:8px 0;text-align:right;color:${TEXT_MAIN};font-size:14px;">${value}</td></tr>`;
    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
            <tr><td style="padding:8px 0;color:${TEXT_MUTED};font-size:14px;vertical-align:top;">Items</td><td style="padding:8px 0;text-align:right;color:${TEXT_MAIN};font-size:14px;font-weight:600;">${itemLines}</td></tr>
            ${row('Item total', `₹${itemsTotal}`)}
            ${b.restaurantGST != null ? row('Restaurant GST', `₹${b.restaurantGST}`) : ''}
            ${b.packagingCharge > 0 ? row('Packaging charge', `₹${b.packagingCharge}`) : ''}
            ${row('Delivery fee', `₹${order.deliveryFee || 0}`)}
            ${b.platformFee != null ? row('Platform fee', `₹${b.platformFee}`) : ''}
            ${b.serviceGST != null ? row('GST on fees', `₹${b.serviceGST}`) : ''}
            ${b.roundOff ? row('Round off (cash on delivery)', `${b.roundOff > 0 ? '+' : ''}₹${b.roundOff}`) : ''}
            <tr><td style="padding:8px 0;color:${TEXT_MUTED};font-size:14px;">Payment method</td><td style="padding:8px 0;text-align:right;color:${TEXT_MAIN};font-size:14px;">${(order.paymentMethod || '').toUpperCase()}</td></tr>
            <tr><td style="padding:8px 0;color:${TEXT_MUTED};font-size:14px;">Payment status</td><td style="padding:8px 0;text-align:right;color:${TEXT_MAIN};font-size:14px;text-transform:capitalize;">${order.paymentStatus}</td></tr>
            <tr><td style="padding:14px 0 0;font-weight:800;font-size:16px;color:${TEXT_MAIN};border-top:1px solid #EEDCDA;">Grand Total</td><td style="padding:14px 0 0;text-align:right;font-weight:800;font-size:16px;color:#E23744;border-top:1px solid #EEDCDA;">₹${order.total}</td></tr>
        </table>
    `;
}

async function sendOrderBillEmail(email, order) {
    const restaurantName = order.items?.[0]?.food?.foodPartner?.name || 'The restaurant';
    const bodyHtml = `
        ${paragraph(`Great news — <strong>${restaurantName}</strong> has accepted your order and started preparing it.`)}
        ${billTable(order)}
        <p style="margin:0;color:${TEXT_MUTED};font-size:13px;">Delivering to: ${order.address}</p>
        <p style="margin:16px 0 0;color:#8A6B6E;font-size:12px;">This is a dummy checkout for testing — no real payment was charged.</p>
    `;
    await sendMail({
        to: email,
        subject: `Order confirmed — your ZomaFeeds bill (#${String(order._id).slice(-6)})`,
        html: renderShell({ preheader: 'Your order has been accepted', heading: 'Your order is confirmed! ✅', bodyHtml })
    });
}

async function sendOrderOutForDeliveryEmail(email, order) {
    const foodName = (order.items || []).map(item => item.food?.name).filter(Boolean).join(', ') || 'Your food';
    const restaurantName = order.items?.[0]?.food?.foodPartner?.name || 'the restaurant';
    const bodyHtml = `
        ${paragraph(`<strong>${foodName}</strong> from <strong>${restaurantName}</strong> has left the kitchen and is on its way to you. 🛵💨`)}
        <p style="margin:0 0 20px;color:${TEXT_MUTED};font-size:13px;">Delivering to: ${order.address}</p>
        <p style="margin:0;color:#8A6B6E;font-size:12px;">This is a dummy checkout for testing — no real delivery is dispatched.</p>
    `;
    await sendMail({
        to: email,
        subject: 'Your order is out for delivery — ZomaFeeds',
        html: renderShell({ preheader: 'Your food is on the way', heading: 'Out for delivery 🛵', bodyHtml })
    });
}

async function sendOrderDeliveredEmail(email, order) {
    const foodName = (order.items || []).map(item => item.food?.name).filter(Boolean).join(', ') || 'Your food';
    const bodyHtml = `
        ${paragraph('Your order has been delivered successfully! 🎉')}
        ${paragraph(`We hope you enjoy <strong>${foodName}</strong>. If you liked it, don't forget to rate the restaurant and your delivery partner on the app.`)}
        ${billTable(order)}
        <p style="margin:0;color:#8A6B6E;font-size:12px;">This is a dummy checkout for testing — no real delivery took place.</p>
    `;
    await sendMail({
        to: email,
        subject: 'Delivered! Enjoy your ZomaFeeds order 🎉',
        html: renderShell({ preheader: 'Your order has arrived', heading: 'Order delivered ✅', bodyHtml })
    });
}

module.exports = { sendOtpEmail, sendWelcomeEmail, sendOrderBillEmail, sendOrderOutForDeliveryEmail, sendOrderDeliveredEmail };
