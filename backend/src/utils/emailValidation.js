const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

// Well-known disposable/throwaway email services — blocked at registration to cut down on
// obviously fake signups. Deliberately does NOT include reserved documentation domains like
// example.com/example.org/test.com (RFC 2606) — those are used for legitimate development and
// testing, not real spam, and blocking them would break that workflow for no real benefit.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'mailinator.com', 'mailinator.net', 'mailinator.org',
    'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
    'guerrillamail.org', 'guerrillamail.net', 'guerrillamailblock.com', 'sharklasers.com', 'grr.la',
    'pokemail.net', 'spam4.me', 'trashmail.com', 'trashmail.net', 'trash-mail.com',
    'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmail.dev',
    '10minutemail.com', '10minutemail.net', 'throwawaymail.com', 'throwaway.email',
    'yopmail.com', 'yopmail.fr', 'yopmail.net', 'maildrop.cc', 'getnada.com', 'mailnesia.com',
    'dispostable.com', 'fakeinbox.com', 'mintemail.com', 'mohmal.com', 'spambog.com',
    'tempinbox.com', 'discard.email', 'mailcatch.com', 'spamgourmet.com', 'emailondeck.com',
    'mailsac.com', 'mailnull.com', 'inboxkitten.com', 'burnermail.io', 'moakt.cc',
]);

function isValidEmail(email) {
    return EMAIL_REGEX.test(email || '');
}

function isDisposableEmail(email) {
    const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
    return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}

// Used specifically at registration / email-change — a syntactically valid email that isn't a
// known throwaway address. Existing accounts are never re-checked against this.
function isAcceptableRegistrationEmail(email) {
    return isValidEmail(email) && !isDisposableEmail(email);
}

module.exports = { EMAIL_REGEX, isValidEmail, isDisposableEmail, isAcceptableRegistrationEmail };
