import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asynHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"


export const verifyJWT = asynHandler(async (req, res,
     next) => {
        try {
            const token = req.cookie?.accessToken || req.header
            ("Authorization")?.replace("Bearer ","")
    
            if(!token){
                throw new ApiError(401, "Unauthorized request")
            }
    
            const decodecToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user =  await User.findById(decodecToken?._id).select
            ("-password -refreshToken")
            if(!user) {
                throw new ApiError (401, "Invalid AcCess token")
            }
            req.user= user
            next()
        } catch (error) {
            throw new ApiError(401, error?.message || "Invalid Access Token")
            
        }

})