import { Club } from "../models/club.models.js";
import { User } from "../models/user.models.js"; // We need this to update the creator's profile
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { parsePageQuery, buildPage } from "../utils/pagination.js";
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

    // 3. Resolve images — prefer direct-uploaded Cloudinary URLs, else multipart.
    const logoDirectUrl = typeof req.body.logoUrl === "string" ? req.body.logoUrl.trim() : "";
    const coverDirectUrl = typeof req.body.coverImageUrl === "string" ? req.body.coverImageUrl.trim() : "";
    const logoLocalPath = req.files?.logo?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!logoDirectUrl && !logoLocalPath) {
        throw new ApiError(400, "Club logo is required to create a club");
    }

    let logoUrl = logoDirectUrl;
    if (!logoUrl) {
        const logo = await uploadOnCloudinary(logoLocalPath);
        if (!logo?.url) throw new ApiError(500, "Failed to upload club logo to cloud storage");
        logoUrl = logo.url;
    }

    let coverUrl = coverDirectUrl;
    if (!coverUrl && coverImageLocalPath) {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        coverUrl = coverImage?.url || "";
    }

    // 4. Create the Club document
    const club = await Club.create({
        name,
        description,
        category,
        contactEmail,
        logo: logoUrl,
        coverImage: coverUrl || "",
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
    // Creator counts as the first member
    await Club.findByIdAndUpdate(club._id, { $inc: { memberCount: 1 } });

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
        // Match the search term against name, description, OR category so a
        // user typing "tech" finds the TECHNICAL club even if the word isn't
        // in its name. Case-insensitive partial match across all three.
        const term = { $regex: search.trim(), $options: "i" };
        dbQuery.$or = [
            { name: term },
            { description: term },
            { category: term },
        ];
    }

    // Cursor pagination (newest-first by _id). memberCount is now stored on
    // the club doc (kept in sync on join/leave), so no per-club $lookup — this
    // is a plain indexed find instead of an aggregation with a subquery.
    const { limit, cursorFilter } = parsePageQuery(req, { defaultLimit: 20 });

    const docs = await Club.find({ ...dbQuery, ...cursorFilter })
        .sort({ _id: -1 })
        .limit(limit + 1);

    const { items, meta } = buildPage(docs, limit);

    return res
        .status(200)
        .json(new ApiResponse(200, items, "Clubs fetched successfully", meta));
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
            // Stage 2: Join the users collection to get the creator's details.
            // (We no longer load ALL members just to count them — memberCount
            // is stored on the club document.)
            $lookup: {
                from: "users",
                localField: "createdBy",
                foreignField: "_id",
                as: "creatorDetails"
            }
        },
        {
            // Stage 3: Restructure the creator array into a single object
            $addFields: {
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
                requiresApproval: 1,
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

    await Club.findByIdAndUpdate(clubId, { $inc: { memberCount: 1 } });

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

    // Decrement but never below 0
    await Club.updateOne(
        { _id: clubId, memberCount: { $gt: 0 } },
        { $inc: { memberCount: -1 } }
    );

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
    const { clubId } = req.params;

    if (!mongoose.isValidObjectId(clubId)) {
        throw new ApiError(400, "Invalid Club ID format");
    }

    const { name, description, contactEmail, isAcceptingMembers, requiresApproval } = req.body;

    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, "Club not found");

    if (club.createdBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only the club creator can modify these details");
    }

    // Handle optional file uploads
    const logoLocalPath = req.files?.logo?.[0]?.path;
    const coverLocalPath = req.files?.coverImage?.[0]?.path;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (contactEmail !== undefined) updateFields.contactEmail = contactEmail;
    if (isAcceptingMembers !== undefined) updateFields.isAcceptingMembers = isAcceptingMembers;
    if (requiresApproval !== undefined) updateFields.requiresApproval = requiresApproval;

    // Direct-uploaded URLs take precedence over legacy multipart files.
    if (typeof req.body.logoUrl === "string" && req.body.logoUrl.trim()) {
        updateFields.logo = req.body.logoUrl.trim();
    } else if (logoLocalPath) {
        const uploaded = await uploadOnCloudinary(logoLocalPath);
        if (uploaded?.url) updateFields.logo = uploaded.url;
    }
    if (typeof req.body.coverImageUrl === "string" && req.body.coverImageUrl.trim()) {
        updateFields.coverImage = req.body.coverImageUrl.trim();
    } else if (coverLocalPath) {
        const uploaded = await uploadOnCloudinary(coverLocalPath);
        if (uploaded?.url) updateFields.coverImage = uploaded.url;
    }

    const updatedClub = await Club.findByIdAndUpdate(
        clubId,
        { $set: updateFields },
        { new: true, runValidators: true }
    );

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

    // 3. Check if requester is a member (all members can see roster, leads see emails too)
    const isLead = club.createdBy.toString() === req.user._id.toString();
    const isMember = req.user.joinedClubs.some(
        (m) => m.club.toString() === clubId
    );
    if (!isMember && !isLead) {
        throw new ApiError(403, "Forbidden: Only club members can view the roster");
    }

    // 4. Fetch members — leads get email, members just get public info
    const selectFields = isLead
        ? "fullName username email avatar joinedClubs.$"
        : "fullName username avatar joinedClubs.$";

    const members = await User.find(
        { "joinedClubs.club": clubId }
    ).select(selectFields);

    // 5. Restructure for frontend
    const formattedRoster = members.map(member => ({
        _id: member._id,
        fullName: member.fullName,
        username: member.username,
        ...(isLead && { email: member.email }),
        avatar: member.avatar,
        role: member.joinedClubs[0].role
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, formattedRoster, "Club roster fetched successfully"));
});



// PATCH /clubs/:clubId/members/:memberId/role  — promote/demote
const updateMemberRole = asyncHandler(async (req, res) => {
    const { clubId, memberId } = req.params;
    const { role } = req.body;

    if (!["MEMBER", "EXECUTIVE"].includes(role))
        throw new ApiError(400, "Role must be MEMBER or EXECUTIVE");

    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, "Club not found");
    if (club.createdBy.toString() !== req.user._id.toString())
        throw new ApiError(403, "Only the club LEAD can change member roles");

    await User.updateOne(
        { _id: memberId, "joinedClubs.club": clubId },
        { $set: { "joinedClubs.$.role": role } }
    );
    return res.status(200).json(new ApiResponse(200, {}, "Member role updated"));
});

// DELETE /clubs/:clubId/members/:memberId  — remove from club
const removeMember = asyncHandler(async (req, res) => {
    const { clubId, memberId } = req.params;

    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, "Club not found");
    if (club.createdBy.toString() !== req.user._id.toString())
        throw new ApiError(403, "Only the club LEAD can remove members");
    if (memberId === req.user._id.toString())
        throw new ApiError(400, "You cannot remove yourself");

    const result = await User.updateOne(
        { _id: memberId, "joinedClubs.club": clubId },
        { $pull: { joinedClubs: { club: clubId } } }
    );
    // Only decrement if the user was actually a member (avoids drift on retries)
    if (result.modifiedCount > 0) {
        await Club.updateOne(
            { _id: clubId, memberCount: { $gt: 0 } },
            { $inc: { memberCount: -1 } }
        );
    }
    return res.status(200).json(new ApiResponse(200, {}, "Member removed"));
});

export {
    createClub,
    getAllClubs,
    getClubProfile,
    joinClub,
    leaveClub,
    deleteClub,
    getMyClubs,
    updateClubDetails,
    getClubMembers,
    updateMemberRole,
    removeMember,
};


