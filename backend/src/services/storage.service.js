const ImageKit = require("imagekit");

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

async function uploadFile(file, fileName) {
    const result = await imagekit.upload({
        file: file,
        fileName: fileName,
    })

    return result;
}

// Swallows its own errors (already-deleted file, transient ImageKit hiccup, etc.) — callers
// use this to free up storage as a best-effort side effect, never to block the action that
// triggered it (a delete, or a replace with a new upload that already succeeded).
async function deleteFile(fileId) {
    if (!fileId) return;
    try {
        await imagekit.deleteFile(fileId);
    } catch (error) {
        console.error('[storage.service] deleteFile failed:', error.message);
    }
}

module.exports = {
    uploadFile,
    deleteFile
}