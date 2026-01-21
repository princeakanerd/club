import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
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
  console.log("Hi 0");

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

  console.log("Hi 1");

  //Sanitised user
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  console.log("Hi 2");

  if (!createdUser) {
    throw new ApiError(400, "Something went wrong while registering the User");
  }
  console.log("Hi 3");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered succesfully"));

  });
const loginUser = asyncHandler(async (req, res) => {
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

export { loginUser, registerUser };
