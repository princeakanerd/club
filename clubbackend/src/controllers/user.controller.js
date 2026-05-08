import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middleware.js";

const registerUser = asyncHandler(async (req, res) => {
  // 1. Extract required text fields from the incoming request body
  const { fullName, email, username, password, batchYear, rollNumber } = req.body;

  // 2. Validate that no required text fields are missing or empty
  if (
      [fullName, email, username, password, rollNumber].some((field) => field?.trim() === "") ||
      !batchYear
  ) {
      throw new ApiError(400, "All required fields (including batchYear and rollNumber) must be provided");
  }

  // 3. Query the database to ensure the user doesn't already exist
  // Using the $or operator to check if ANY of the unique fields are already taken
  const existingUser = await User.findOne({
      $or: [{ username }, { email }, { rollNumber }]
  });

  if (existingUser) {
      throw new ApiError(409, "A user with this email, username, or roll number already exists");
  }

  // 4. Extract the local file path for the avatar (populated by Multer middleware)
  const avatarLocalPath = req.files?.avatar[0]?.path;

  if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required for registration");
  }

  // 5. Upload the avatar to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar || !avatar.url) {
      throw new ApiError(500, "Error occurred while uploading the avatar to Cloudinary");
  }

  // 6. Create the new user document in MongoDB
  // Note: The password will be automatically hashed by your pre("save") hook
  const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      batchYear,
      rollNumber,
      avatar: avatar.url,
      // bio, interests, and joinedClubs are optional, so we leave them out for now
  });

  // 7. Retrieve the created user from the database and remove sensitive fields before sending the response
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user in the database");
  }

  // 8. Send the final success response to the client
  return res.status(201).json(
      new ApiResponse(201, createdUser, "User registered successfully")
  );
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

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        //This 1 acts as a boolean flag
        refreshToken: 1,
      },
    },
    {
      //This new: true ki wjh se it returns us the document after the changes have been applied
      new: true,
    }
  );
  //Instead of removing this refreshToken we could have just set it to null, But it would consume faltu ki space and also if we are indexing the refreshToken then unnecessarily many entries will be null

  //These options must match the options used during login
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User loggedout Succesfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //Incase the accessToken expires we generate a new one using the refreshToken in the db

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorised request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }

    if (incomingRefreshToken != user?.refreshToken) {
      throw new ApiError(401, "RefreshToken is expired or used");
    }

    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "AccessToken Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid RefreshToken");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // steps

  //extract new and old password
  //now req.user doesnt have the password field so I need to fetch that password from Db using User.findbyId(), I have id from req.user

  //Validate the password using ispasswordCorrect(oldpassword)
  //If password is correct update the newpassword
  // hash and store in db

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both new and old Passwords are required");
  }

  const user = await User.findById(req.user._id);

  const ispasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!ispasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  // save to db only after hashing

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Succesfully"));
});

const getCurrentUser = asyncHandler((req, res) => {
  //This will be triggered after the verifyJWT middleware so we already have req.user

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user Fetched Succesfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // 1. Extract file path
  const avatarLocalPath = req.file?.path;
  console.log(avatarLocalPath);
  
  if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing");
  }

  // 2. Upload to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  
  if (!avatar.url) {
      throw new ApiError(400, "Error while uploading on cloudinary");
  }

  // 3. Retrieve old avatar url directly from the injected req.user object
  const oldAvatarUrl = req.user.avatar;

  // 4. Update the database
  const user = await User.findByIdAndUpdate(
      req.user._id,
      {
          $set: {
              avatar: avatar.url,
          },
      },
      { new: true }
  ).select("-password -refreshToken");

  // 5. Delete old file from Cloudinary
  if (oldAvatarUrl) {
      await deleteFromCloudinary(oldAvatarUrl);
  }

  // 6. Send response
  return res.status(200).json(new ApiResponse(200, user, "Avatar updated!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // 1. Extract the local file path (populated by Multer)
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover image file is missing");
  }

  // 2. Upload the new file to Cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading cover image to Cloudinary");
  }

  // 3. Retrieve the old cover image URL directly from the injected req.user object
  const oldCoverImageUrl = req.user.coverImage;

  // 4. Update the database document with the new URL
  const user = await User.findByIdAndUpdate(
      req.user._id,
      {
          $set: {
              coverImage: coverImage.url
          }
      },
      { new: true }
  ).select("-password -refreshToken");

  // 5. Delete the old image from Cloudinary (ONLY IF it existed previously)
  if (oldCoverImageUrl) {
      await deleteFromCloudinary(oldCoverImageUrl);
  }

  // 6. Return the updated user object
  return res
      .status(200)
      .json(new ApiResponse(200, user, "Cover image updated successfully"));
});



export {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
};
