import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
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

userSchema.pre("save", async function(next){
    if(this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

userSchema.method.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password) ;
}

export const User = mongoose.model("User", userSchema) ;