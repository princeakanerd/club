class ApiResponse{
    constructor(
        statusCode,
        data,
        message = "Success",
        meta = undefined
    ){
        this.statusCode = statusCode ;
        this.data = data ;
        this.message = message ;
        this.success = statusCode < 400
        // Optional pagination/extra info. Omitted from the JSON when unset so
        // existing (non-paginated) responses are byte-for-byte unchanged.
        if (meta !== undefined) this.meta = meta ;
    }
}
export {ApiResponse};