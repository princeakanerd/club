import mongoose, {Schema} from "mongoose";

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
        
    }, {
        timestamps : true
    }
)

export const User = mongoose.model("User", userSchema) ;