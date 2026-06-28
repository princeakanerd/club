import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

// Non-throwing version — attaches user if token present, otherwise continues as guest
export const optionalJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (token) {
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
            if (user) req.user = user;
        }
    } catch (_) { /* ignore */ }
    next();
};

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try{
        // For mobile and third party apps they can access using the authorization header 
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "") ;

        if(!token){
            throw new ApiError(401, "Unauthorised request") ;
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) ;
        //DecodedToken ke andar wo saari fields hai jo maine token mein store kari thi
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken") ;

        if(!user) {
            throw new ApiError(401, "Invalid Access Token") ;
        }
        req.user = user ;
        next() ;
    } catch(error){
        throw new ApiError(401, error?.message || "Invalid access Token") ;
    }
});

