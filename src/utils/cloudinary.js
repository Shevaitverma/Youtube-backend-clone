// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs";

// const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
// const cloudApiKey = process.env.CLOUDINARY_API_KEY;
// const cloudApiSecret = process.env.CLOUDINARY_API_SECRET
// const PORT = process.env.PORT;

// if(!cloudApiKey || !cloud_name || !cloudApiSecret){
//     // console.error("cloudinary apiket is incorrect");
//     console.log(cloudApiKey);
//     console.log(cloudApiKey);
//     console.log(cloudApiSecret);
// }

// cloudinary.config({
//   cloud_name: cloud_name,
//   api_key: cloudApiKey,
//   api_secret: cloudApiSecret,
// });

// const updoadOnCloudinary = async (localFilePath) => {
    
//   try {
//     if (!localFilePath) return null;

//     // upload the file on cloudinary
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//     });

//     // file uploaded successfully
//     console.log("File is uploaded", response.url);
//     return response;
//   } catch (error) {
//     // remove the locally saved temporary file as the upload operation got failed
//     fs.unlinkSync(localFilePath);
//     console.error("Error uploading to Cloudinary:", error);
//     return null;
//   }
// };

// export { updoadOnCloudinary };


import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from "dotenv";
dotenv.config()

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export {uploadOnCloudinary}