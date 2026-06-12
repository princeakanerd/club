import { Club } from "../models/club.models.js";
import { User } from "../models/user.models.js"; // We need this to update the creator's profile
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const createClub = asyncHandler(async (req, res) => {
    // 1. Extract text payload
    const { name, description, category, contactEmail } = req.body;
    
    if (!name || !description || !category) {
        throw new ApiError(400, "Name, description, and category are required");
    }
    // 2. Prevent duplicate clubs
    
    const existingClub = await Club.findOne({ name });
    
    if (existingClub) {
        throw new ApiError(409, "A club with this exact name already exists");
    }

    // 3. Extract and upload files (Multer will provide req.files)
    const logoLocalPath = req.files?.logo?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!logoLocalPath) {
        throw new ApiError(400, "Club logo is required to create a club");
    }

    const logo = await uploadOnCloudinary(logoLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if (!logo.url) {
        throw new ApiError(500, "Failed to upload club logo to cloud storage");
    }

    // 4. Create the Club document
    const club = await Club.create({
        name,
        description,
        category,
        contactEmail,
        logo: logo.url,
        coverImage: coverImage?.url || "",
        createdBy: req.user._id // Extracted from the verifyJWT middleware
    });

    // 5. Dual Operation: Update the User document
    // We push the club ID into the creator's joinedClubs array and make them the LEAD
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $push: {
                joinedClubs: {
                    club: club._id,
                    role: "LEAD" // Enum from your userSchema
                }
            }
        }
    );

    // 6. Return response
    return res.status(201).json(new ApiResponse(201, club, "Club successfully created"));
});

const getAllClubs = asyncHandler(async (req, res) => {
    // 1. Extract optional query parameters from the URL
    // e.g., /api/v1/clubs?category=TECHNICAL&search=innovators
    const { category, search } = req.query;

    // 2. Initialize an empty query object
    const dbQuery = {};

    // 3. Conditionally build the database query based on what the client provided
    if (category) {
        dbQuery.category = category.toUpperCase();
    }

    if (search) {
        // Use a regular expression for partial, case-insensitive string matching, options "i" does case insensitive
        dbQuery.name = { $regex: search, $options: "i" }; 
    }

    // 4. Execute the database search
    const clubs = await Club.find(dbQuery)
        .populate("createdBy", "fullName username avatar") // Replaces the creator's ID with their actual profile data
        .sort({ createdAt: -1 }); // Sorts the array so the newest clubs appear first

    // 5. Return the array of clubs
    return res
        .status(200)
        .json(new ApiResponse(200, clubs, "Clubs fetched successfully"));
});

const getClubProfile = asyncHandler(async (req, res) => {
    // 1. Extract the clubId from the URL parameters
    const { clubId } = req.params;

    // 2. Validate that the provided string is a mathematically valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 3. Execute the Aggregation Pipeline
    const club = await Club.aggregate([
        {
            // Stage 1: Locate the exact club document
            $match: {
                _id: new mongoose.Types.ObjectId(clubId)
            }
        },
        {
            // Stage 2: Join the users collection to find all members
            $lookup: {
                from: "users", 
                localField: "_id", 
                foreignField: "joinedClubs.club", 
                as: "members" 
            }
        },
        {
            // Stage 3: Join the users collection again to get the creator's details
            $lookup: {
                from: "users",
                localField: "createdBy",
                foreignField: "_id",
                as: "creatorDetails"
            }
        },
        {
            // Stage 4: Compute data and restructure arrays
            $addFields: {
                memberCount: {
                    $size: "$members" 
                },
                createdBy: {
                    $first: "$creatorDetails" 
                }
            }
        },
        {
            // Stage 5: Strip out sensitive/unnecessary data before sending to the client
            $project: {
                name: 1,
                description: 1,
                category: 1,
                logo: 1,
                coverImage: 1,
                contactEmail: 1,
                isAcceptingMembers: 1,
                memberCount: 1,
                createdAt: 1,
                "createdBy.fullName": 1,
                "createdBy.username": 1,
                "createdBy.avatar": 1
            }
        }
    ]);

    // 4. Aggregation returns an array. If length is 0, the $match stage found nothing.
    if (!club?.length) {
        throw new ApiError(404, "Club not found");
    }

    // 5. Return the single club object (index 0)
    return res
        .status(200)
        .json(new ApiResponse(200, club[0], "Club profile fetched successfully"));
});

const joinClub = asyncHandler(async (req, res) => {
    // 1. Extract and validate the clubId from the URL
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Verify the club exists and check its status
    const club = await Club.findById(clubId);

    if (!club) {
        throw new ApiError(404, "Club not found");
    }

    // Business Logic: Check if the club is actively accepting members
    if (!club.isAcceptingMembers) {
        throw new ApiError(403, "This club is currently not accepting new members");
    }

    // 3. Prevent duplicate memberships
    // req.user is populated by your verifyJWT middleware.
    // We must use .toString() because MongoDB ObjectIds are mathematically distinct from standard strings.
    const isAlreadyMember = req.user.joinedClubs.some(
        (membership) => membership.club.toString() === clubId
    );

    if (isAlreadyMember) {
        throw new ApiError(400, "You are already a member of this club");
    }

    // 4. Update the User document in the database
    // The $push operator injects the new club object directly into the MongoDB array
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $push: {
                joinedClubs: {
                    club: clubId,
                    role: "MEMBER" // This string strictly matches your User schema enum
                }
            }
        },
        { new: true } // Returns the newly updated document instead of the old one
    ).select("-password -refreshToken"); // Strip sensitive data

    // 5. Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Successfully joined the club"));
});

const leaveClub = asyncHandler(async (req, res) => {
    // 1. Extract and validate the clubId from the URL
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Locate the specific membership object inside the user's array
    // We use standard JavaScript .find() on the array residing in Node.js memory
    const membership = req.user.joinedClubs.find(
        (membership) => membership.club.toString() === clubId
    );

    // 3. Validation: If the membership object is undefined, they aren't in the club
    if (!membership) {
        throw new ApiError(400, "You are not a member of this club");
    }

    // 4. Business Logic: Prevent the LEAD from abandoning the club
    if (membership.role === "LEAD") {
        throw new ApiError(
            400, 
            "As the club LEAD, you cannot simply leave. You must delete the club or transfer ownership first."
        );
    }

    // 5. Update the Database
    // The $pull operator executes directly on the MongoDB server
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $pull: {
                joinedClubs: {
                    club: clubId // Instructs MongoDB to delete the object where the club ID matches
                }
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    // 6. Return the updated user object
    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Successfully left the club"));
});

const deleteClub = asyncHandler(async (req, res) => {
    // 1. Extract and validate the clubId
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Locate the club to verify existence and ownership
    const club = await Club.findById(clubId);

    if (!club) {
        throw new ApiError(404, "Club not found");
    }

    // 3. Authorization (RBAC)
    // Strictly enforce that only the creator can delete the entire club
    if (club.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the club creator can delete this club");
    }

    // 4. Database Operation 1: Delete the Club Document
    await Club.findByIdAndDelete(clubId);

    // 5. Database Operation 2: The Cascading Delete
    // updateMany targets multiple documents simultaneously.
    await User.updateMany(
        { "joinedClubs.club": clubId }, // Filter: Find ALL users who have this specific club ID in their array
        {
            $pull: {
                joinedClubs: { club: clubId } // Action: Surgically extract and delete that specific object from their array
            }
        }
    );

    // 6. Return a success response with an empty data object
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Club and all associated memberships deleted successfully"));
});

const getMyClubs = asyncHandler(async (req, res) => {
    // 1. Fetch the user document and execute a Deep Populate
    const user = await User.findById(req.user._id).populate({
        path: "joinedClubs.club", // Instructs Mongoose to look inside the array, find the 'club' key, and resolve the ObjectId
        select: "name description category logo coverImage isAcceptingMembers" // Project only the necessary fields to save bandwidth
    });

    if (!user) {
        throw new ApiError(404, "User profile not found");
    }

    // 2. Extract the populated array
    // At this point, user.joinedClubs contains objects that look like:
    // { role: "LEAD", club: { _id: "...", name: "Tech Club", logo: "..." } }
    const myClubs = user.joinedClubs;

    // 3. Return the array to the client
    return res
        .status(200)
        .json(new ApiResponse(200, myClubs, "User's clubs fetched successfully"));
});

const updateClubDetails = asyncHandler(async (req, res) => {
    // 1. Extract and validate the clubId
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Extract the fields the client wants to update
    const { name, description, contactEmail, isAcceptingMembers } = req.body;

    // Validation: Ensure at least one field is provided to prevent empty database writes
    if (!name && !description && !contactEmail && isAcceptingMembers === undefined) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    // 3. Fetch the club document to verify ownership
    const club = await Club.findById(clubId);

    if (!club) {
        throw new ApiError(404, "Club not found");
    }

    // 4. Authorization (RBAC)
    // Convert both ObjectIds to strings to ensure strict mathematical equality
    if (club.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the club creator can modify these details");
    }

    // 5. Execute the Database Update
    // The $set operator overwrites only the provided fields, leaving the rest untouched
    const updatedClub = await Club.findByIdAndUpdate(
        clubId,
        {
            $set: {
                name,
                description,
                contactEmail,
                isAcceptingMembers
            }
        },
        { new: true, runValidators: true } // Forces Mongoose to run schema validation on the new data
    );

    // 6. Return the updated document
    return res
        .status(200)
        .json(new ApiResponse(200, updatedClub, "Club details updated successfully"));
});

const getClubMembers = asyncHandler(async (req, res) => {
    // 1. Extract and validate the clubId
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    // 2. Fetch the club to verify existence and check authorization
    const club = await Club.findById(clubId);

    if (!club) {
        throw new ApiError(404, "Club not found");
    }

    // 3. Authorization (RBAC)
    // Enforce that only the club LEAD can access the member roster emails and data
    if (club.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the club LEAD can view the member roster");
    }

    // 4. Execute the Database Read Operation
    // Query the User collection for anyone who has this clubId in their joinedClubs array.
    const members = await User.find(
        { "joinedClubs.club": clubId }
    ).select("fullName username email avatar joinedClubs.$"); 
    // The '$' Positional Operator projects ONLY the specific joinedClubs object that matched our query.

    // 5. Restructure the data for the frontend payload
    const formattedRoster = members.map(member => ({
        _id: member._id,
        fullName: member.fullName,
        username: member.username,
        email: member.email,
        avatar: member.avatar,
        role: member.joinedClubs[0].role // Extract the exact role for this specific club
    }));

    // 6. Return the secure roster payload
    return res
        .status(200)
        .json(new ApiResponse(200, formattedRoster, "Club roster fetched successfully"));
});



// Update the exports at the bottom of the file:
export { 
    createClub, 
    getAllClubs, 
    getClubProfile, 
    joinClub, 
    leaveClub, 
    deleteClub, 
    getMyClubs,
    updateClubDetails,
    getClubMembers
};


