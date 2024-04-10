import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({
    cloud_name: 'chaiaurcode',
    api_key:'',
    api_secret: ''
});

const uploadOnCloudinary = async(localFilePath) => {
    try {
        if(!localFilePath)return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload
        (localFilePath, {
            resource_type: "auto"
        });
        fs.unlinkSync(localFilePath);
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
        
    }
}

export {uploadOnCloudinary}