import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const userSchema = new Schema(
    {
        fullName : {
            type : String,
            index: true,
            required: true,
            trim : true
        },
        username : {
            type: String,
            unique: true,
            lowercase : true,
            index :true,
            required : true,
            trim: true,
        },
        email : {
            type : String,
            unique : true,
            required : true,
            lowercase : true,
            trim : true
        },
        avatar : {
            type : String, // This will be the cloudinary URL
            required : true
        },
        coverImage: {
            type: String, // This will be the cloudinary URL
        },
        batchYear : {
            type : Number ,
            required : true,
        },
        rollNumber : {
            type : String,
            required : true,
            unique : true,
        },
        bio : {
            type : String, // A short description about themselves
            maxLength : 250
        },
        interests : [ // An array of strings like "Debate, Sports, Music, Coding etc"
            {
                type :String, 
                trim : true,
            }
        ],
        password : {
            type : String,
            required : [true, 'Password is required'],
        },
        refreshToken : {
            type : String
        },
        connections: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User" },
                status: {
                    type: String,
                    enum: ["PENDING", "ACCEPTED"],
                    default: "PENDING",
                },
                initiatedBy: { type: Schema.Types.ObjectId, ref: "User" },
            }
        ],
        joinedClubs : [
            {
                club : {
                    type : Schema.Types.ObjectId,
                    ref : "Club",
                },
                role : {
                    type : String,
                    enum : [ "MEMBER", "EXECUTIVE", "LEAD"] ,
                    default : "MEMBER",
                },
                joinedAt : {
                    type : Date,
                    default : Date.now
                }
            }
        ],
        // Email verification: we store only a HASH of the token, never the raw
        // token, so a DB leak can't be used to verify/hijack accounts.
        isEmailVerified : {
            type : Boolean,
            default : false,
        },
        emailVerificationToken : {
            type : String,
            select : false,
        },
        emailVerificationExpiry : {
            type : Date,
            select : false,
        },
        // Password reset: same hashed-token pattern, short-lived.
        passwordResetToken : {
            type : String,
            select : false,
        },
        passwordResetExpiry : {
            type : Date,
            select : false,
        },
        // Expo push tokens (one per device the user is signed in on). We push
        // to all of them when a notification is created for this user.
        pushTokens : [
            {
                type : String,
            }
        ],

    }, {
        timestamps : true
    }
)

// Hot path: every club member-count, roster lookup, and "is this user a
// member?" check queries by joinedClubs.club. Without this it's a full
// collection scan — the single most impactful index in the app.
userSchema.index({ "joinedClubs.club": 1 });

userSchema.pre("save", async function(){
    // console.log("1. Pre-save hook started"); // Debug Log

    if(!this.isModified("password")) {
        return ;
    }

    // console.log("2. Password modified. Hashing now..."); // Debug Log
    this.password = await bcrypt.hash(this.password, 10);
    
    // console.log("3. Hashing done. Calling next()"); // Debug Log
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password) ;
}

userSchema.methods.generateAccessToken = function(){
    // jwt.sign(payload, secret, options)
    return jwt.sign({
        _id : this._id,
        email : this.email,
        fullname : this.fullName,
        username : this.username
    }, process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign({
        _id : this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    })
}

/* Generate a one-time token for email verification / password reset.
   Returns the RAW token (goes in the emailed link); stores only its SHA-256
   HASH plus an expiry on the document. Caller must save the document.
   `kind` is "emailVerification" or "passwordReset". */
userSchema.methods.generateOneTimeToken = function(kind, ttlMinutes = 30) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = Date.now() + ttlMinutes * 60 * 1000;

    if (kind === "emailVerification") {
        this.emailVerificationToken = hashed;
        this.emailVerificationExpiry = expiry;
    } else if (kind === "passwordReset") {
        this.passwordResetToken = hashed;
        this.passwordResetExpiry = expiry;
    } else {
        throw new Error(`Unknown one-time token kind: ${kind}`);
    }

    return rawToken;
};

export const User = mongoose.model("User", userSchema) ;