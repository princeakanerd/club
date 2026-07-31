import {v2 as cloudinary} from "cloudinary"
import { log } from "console";
import fs from "fs" ;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async(localFilePath) => {

    
    try {
        if(!localFilePath) return null ;
    
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("File uploaded on cloudinary successfully:", response.url);
        //Remove the local file
        fs.unlinkSync(localFilePath);

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);
    }
    
}

const deleteFromCloudinary = async(cloudinaryUrl) => {
    try {
        if(!cloudinaryUrl) return null ;
        
        // we'll  extract the cloudinary public id from the url
        // Example URL: https://res.cloudinary.com/your-cloud-name/image/upload/v1700000000/my_avatar_id.jpg
        const urlArray = cloudinaryUrl.split("/") ;
        const imageWithExtension = urlArray.pop() ; // Returns "my_avatar_id.jpg"
        const publicId = imageWithExtension.split(".")[0] ; 

        const response = await cloudinary.uploader.destroy(publicId) ;

        console.log(`Successfully deleted old asset from Cloudinary: ${publicId}`);
        return response ;

    } catch (error) {
        console.log("error deleting file from cloudinary", error);
        return null ;
    }
}

/* Produce a short-lived signature so the BROWSER can upload directly to
   Cloudinary — the file bytes never touch our server. The client POSTs the
   file + these params to Cloudinary's upload endpoint. */
const generateUploadSignature = ({ folder = "clubapp" } = {}) => {
    const timestamp = Math.round(Date.now() / 1000);
    // Only params included here must be echoed by the client, and they must be
    // signed in alphabetical order (Cloudinary requirement).
    const paramsToSign = { folder, timestamp };
    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET
    );
    return {
        signature,
        timestamp,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
};

export {uploadOnCloudinary, deleteFromCloudinary, generateUploadSignature}