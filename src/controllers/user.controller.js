import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middleware.js";

const registerUser = asyncHandler(async (req, res, next) => {
  //Fetch fullName, email , username, password from req.body
  //Validate if fields are empty
  // Check if somebody with that email already exists
  // If everything is fine now fetch local file path for avatar and CovImg
  // UPload them on cloudinary
  // now create the db object
  //Get and return the sanitised user

  const { fullName, email, username, password, rollNumber, batchYear } =
    req.body;

  if (
    [fullName, email, username, password, rollNumber, batchYear].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    //checks if the user with this email or username exists
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //File handling

  //req.files is injected by multer middleware ( which is setup in the routes ) ;
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  //It might not exist as its not compulsory

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  //Upload to cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  console.log(avatar);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload to cloudinary failed");
  }
  // console.log("Hi 0");
  //Create user Object in db

  const user = await User.create({
    fullName,
    avatar: avatar.url, // WE save only the string and not the complete object
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
    rollNumber,
    batchYear,
  });

  // console.log("Hi 1");

  //Sanitised user
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // console.log("Hi 2");

  if (!createdUser) {
    throw new ApiError(400, "Something went wrong while registering the User");
  }
  // console.log("Hi 3");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered succesfully"));

});

const loginUser = asyncHandler(async (req, res, next) => {
  // steps

  //req.body se email and password lo
  //If email is empty or invalid throw api error fields missing
  // Now find the user in the db
  //Verify the password
  //Generate both the tokens
  //Save the refreshToken in the DB
  // Get the sanitized user
  //Now return the response along with cookies

  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is Missing");
  }
  // find user in the db
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User with this email does not exist");
  }
  //verify password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  //Generate our tokens

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  //Attaching the refreshToken field
  user.refreshToken = refreshToken;
  //Saving the user to DB
  await user.save({ validateBeforeSave: false });

  //Getting the sanitized user(without pw and without RT) to return to the frontEnd

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in Succesfully! "
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {

      // I need to find ki konse user ko logout karna hai so we already have req.user which was set by our auth.middleware verifyJWT function
      // As we have the user so as its logging out we'll remove the refreshToken field from the DB for this uer

      await User.findByIdAndUpdate(req.user._id,
        {
          $unset: {
            //This 1 acts as a boolean flag 
            refreshToken: 1
          }
        },
        {
          //This new: true ki wjh se it returns us the document after the changes have been applied
          new : true
        }
      );
      //Instead of removing this refreshToken we could have just set it to null, But it would consume faltu ki space and also if we are indexing the refreshToken then unnecessarily many entries will be null

      //These options must match the options used during login
      const options = {
        httpOnly : true,
        secure : true,
      }

      return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User loggedout Succesfully")) ;

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //Incase the accessToken expires we generate a new one using the refreshToken in the db

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken ;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised request") ;
    }

    try {
          const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET) ;
          const user = await User.findById(decodedToken?._id) ;

          if(!user){
            throw new ApiError(401, "Invalid refresh Token") ;
          }

          if(incomingRefreshToken != user?.refreshToken){
            throw new ApiError(401, "RefreshToken is expired or used") ;
          }

          const accessToken = user.generateAccessToken() ;
          const newRefreshToken = user.generateRefreshToken() ;

          user.refreshToken = newRefreshToken ;
          await user.save({validateBeforeSave: false}) ;

          const options = {
            httpOnly: true,
            secure : true
          }

          return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", newRefreshToken, options) 
          .json(
            new ApiResponse(200, 
              {
                accessToken, refreshToken: newRefreshToken
              }, "AccessToken Refreshed"
            )
          )


    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid RefreshToken") ;
    }


})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  // steps 

  //extract new and old password
  //now req.user doesnt have the password field so I need to fetch that password from Db using User.findbyId(), I have id from req.user

  //Validate the password using ispasswordCorrect(oldpassword)
  //If password is correct update the newpassword
  // hash and store in db

  const {oldPassword, newPassword} = req.body ;
  if(!oldPassword || !newPassword) {
    throw new ApiError(400, "Both new and old Passwords are required") ;
  }

  const user = await User.findById(req.user._id) ;

  const ispasswordCorrect = await user.isPasswordCorrect(oldPassword) ;
  if(!ispasswordCorrect) {
    throw new ApiError(400, "Invalid old password") ;
  }

  user.password = newPassword

  // save to db only after hashing

  await user.save({validateBeforeSave : false}) ;

  return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed Succesfully")) ;

})

const getCurrentUser = asyncHandler((req, res) => {
  //This will be triggered after the verifyJWT middleware so we already have req.user

  return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user Fetched Succesfully")) ;
})

const updateAccountDetails = asyncHandler(async (req, res ) => {
  const {fullName, email} = req.body ;

  if(!fullName || !email){
    throw new ApiError(400, "All fields are required") ;
  }

  const user = await User.findByIdAndUpdate(req.user._id, 
    {
      $set: {
        fullName: fullName,
        email: email
      }
    }, {
      new: true,
      runValidators: true
    }
  ).select("-password -refreshToken");
  return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated")) ;
})

const updateUserAvatar = asyncHandler(async(req, res) => {
  //WE are expecting a single file and not an array or smth, or else we would have done files[0].path
  const avatarLocalPath = req.file?.path ;

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing") ;
  }

  // Now we'll upload this file to cloudinary

  const avatar = await uploadOnCloudinary(avatarLocalPath) ;
  if(!avatar.url){
    throw new ApiError(400, "Error while uploading on cloudinary") ;
  }

  // retrieve old avatar url

  const currentUser = await User.findbyId(req.user._id) ;
  const oldAvatarUrl = currentUser.avatar ;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url
      }
    }, 
    {new : true}
  ).select("-password -refreshToken");

  if(oldAvatarUrl){
      await deleteFromCloudinary(oldAvatarUrl) ;
  }

  return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated!")) ;


})

// TODO: Test updateAvatar Controller

export { loginUser, registerUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails};
