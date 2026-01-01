
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        return await fn(req, res, next) ;
    } catch (err) {
        res.status(err.statusCode || 500).json({
            message : err.message,
            success : false
        })
    }
} 

export {asyncHandler}